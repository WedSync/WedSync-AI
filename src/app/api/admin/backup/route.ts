import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { BackupScheduler } from '@/lib/backup/backup-scheduler';
import { BackupSecurityMiddleware } from '@/lib/middleware/backup-security';
import {
  BackupValidator,
  createBackupSchema,
  listBackupsSchema,
} from '@/lib/security/backup-validator';
import { z } from 'zod';

/**
 * Admin Backup Management API
 *
 * GET    /api/admin/backup - List backup jobs and status
 * POST   /api/admin/backup - Create new backup job
 *
 * Security: Admin authentication required
 * Rate limiting: Applied per operation type
 * Audit logging: All operations logged
 */

const backupScheduler = new BackupScheduler();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let admin: any = null;

  try {
    // Admin authentication check
    const authResult =
      await BackupSecurityMiddleware.validateAdminAccess(request);
    if (!authResult.isValid) {
      await BackupSecurityMiddleware.logAuditEvent({
        operation: 'backup_list',
        success: false,
        errorCode: 'AUTH_FAILED',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });

      return BackupSecurityMiddleware.createErrorResponse(
        authResult.error || 'Authentication required',
        401,
        'AUTH_FAILED',
      );
    }

    admin = authResult.admin;

    // Rate limiting check
    const rateLimitResult = await BackupSecurityMiddleware.checkRateLimit(
      'backup_list',
      admin.id,
    );

    if (!rateLimitResult.allowed) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_list',
        success: false,
        errorCode: 'RATE_LIMITED',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });

      return BackupSecurityMiddleware.createErrorResponse(
        'Rate limit exceeded',
        429,
        'RATE_LIMITED',
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      backupType: url.searchParams.get('backupType') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    };

    const validation = BackupValidator.validateListRequest(queryParams);
    if (!validation.success) {
      return BackupSecurityMiddleware.createErrorResponse(
        `Invalid query parameters: ${validation.errors?.join(', ')}`,
        400,
        'VALIDATION_FAILED',
      );
    }

    // Get organization ID from admin context (implement based on your auth system)
    const organizationId = await getOrganizationIdForAdmin(admin.id);
    if (!organizationId) {
      return BackupSecurityMiddleware.createErrorResponse(
        'Organization not found for admin',
        404,
        'ORG_NOT_FOUND',
      );
    }

    // List backups with filtering
    const backups = await listBackupsForOrganization(
      organizationId,
      validation.data!,
    );

    const duration = Date.now() - startTime;

    // Log successful operation
    await BackupSecurityMiddleware.logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      operation: 'backup_list',
      success: true,
      duration,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return BackupSecurityMiddleware.createSuccessResponse({
      backups: backups.items,
      pagination: {
        total: backups.total,
        limit: validation.data!.limit,
        offset: validation.data!.offset,
        hasMore: backups.hasMore,
      },
      filters: {
        backupType: validation.data!.backupType,
        startDate: validation.data!.startDate,
        endDate: validation.data!.endDate,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Log failed operation
    if (admin) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_list',
        success: false,
        errorCode: 'INTERNAL_ERROR',
        duration,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });
    }

    console.error('Backup list API error:', error);

    return BackupSecurityMiddleware.createErrorResponse(
      'Failed to retrieve backups',
      500,
      'INTERNAL_ERROR',
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let admin: any = null;
  let requestBody: any = null;

  try {
    // Admin authentication check
    const authResult =
      await BackupSecurityMiddleware.validateAdminAccess(request);
    if (!authResult.isValid) {
      await BackupSecurityMiddleware.logAuditEvent({
        operation: 'backup_create',
        success: false,
        errorCode: 'AUTH_FAILED',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });

      return BackupSecurityMiddleware.createErrorResponse(
        authResult.error || 'Authentication required',
        401,
        'AUTH_FAILED',
      );
    }

    admin = authResult.admin;

    // Rate limiting check
    const rateLimitResult = await BackupSecurityMiddleware.checkRateLimit(
      'backup_create',
      admin.id,
    );

    if (!rateLimitResult.allowed) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_create',
        success: false,
        errorCode: 'RATE_LIMITED',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });

      return BackupSecurityMiddleware.createErrorResponse(
        'Rate limit exceeded',
        429,
        'RATE_LIMITED',
      );
    }

    // Parse request body
    try {
      requestBody = await request.json();
    } catch (error) {
      return BackupSecurityMiddleware.createErrorResponse(
        'Invalid JSON in request body',
        400,
        'INVALID_JSON',
      );
    }

    // Validate backup creation request
    const validation = BackupValidator.validateCreateRequest(requestBody);
    if (!validation.success) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_create',
        success: false,
        errorCode: 'VALIDATION_FAILED',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });

      return BackupSecurityMiddleware.createErrorResponse(
        `Validation failed: ${validation.errors?.join(', ')}`,
        400,
        'VALIDATION_FAILED',
      );
    }

    const validatedData = validation.data!;

    // Get organization ID from admin context
    const organizationId = await getOrganizationIdForAdmin(admin.id);
    if (!organizationId) {
      return BackupSecurityMiddleware.createErrorResponse(
        'Organization not found for admin',
        404,
        'ORG_NOT_FOUND',
      );
    }

    // Create backup policy for manual backup
    const backupPolicy = {
      id: generatePolicyId(),
      organizationId,
      policyName: `Manual backup - ${new Date().toISOString()}`,
      backupType: validatedData.backupType,
      frequencyType: 'manual' as const,
      frequencyValue: 1,
      backupTime: new Date().toTimeString().substring(0, 5),
      timezone: 'UTC',
      retentionDays: validatedData.retentionDays,
      includeUserData: validatedData.includeDatabase,
      includeMediaFiles: validatedData.includeUploads,
      includeDocuments: true,
      includeAnalytics: false,
      exclusionPatterns: [],
      isActive: true,
    };

    // Schedule backup immediately
    const backupJob = await backupScheduler.scheduleBackup(
      organizationId,
      backupPolicy,
    );

    // Execute backup immediately for manual backups
    const backupResult = await backupScheduler.executeBackup(backupJob.id);

    const duration = Date.now() - startTime;

    // Log successful operation
    await BackupSecurityMiddleware.logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      operation: 'backup_create',
      backupType: validatedData.backupType,
      success: true,
      duration,
      fileSize: backupResult.totalSize,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return BackupSecurityMiddleware.createSuccessResponse(
      {
        backupId: backupResult.backupId,
        jobId: backupJob.id,
        status: 'completed',
        backupType: validatedData.backupType,
        totalSize: backupResult.totalSize,
        compressedSize: backupResult.compressedSize,
        duration: backupResult.duration,
        storageLocation: backupResult.storageLocation,
        verification: backupResult.verification,
        createdAt: new Date().toISOString(),
        retentionUntil: new Date(
          Date.now() + validatedData.retentionDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      201,
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Log failed operation
    if (admin) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_create',
        backupType: requestBody?.backupType,
        success: false,
        errorCode: 'INTERNAL_ERROR',
        duration,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });
    }

    console.error('Backup creation API error:', error);

    return BackupSecurityMiddleware.createErrorResponse(
      'Failed to create backup',
      500,
      'INTERNAL_ERROR',
    );
  }
}

// Helper functions

async function getOrganizationIdForAdmin(
  adminId: string,
): Promise<string | null> {
  // Implement based on your user/organization model
  // This should query your database to get the organization ID for the admin
  // For now, return a placeholder
  return 'org-placeholder-id';
}

async function listBackupsForOrganization(
  organizationId: string,
  filters: z.infer<typeof listBackupsSchema>,
): Promise<{
  items: any[];
  total: number;
  hasMore: boolean;
}> {
  // This would integrate with your database to list backups
  // For now, return placeholder data
  return {
    items: [
      {
        id: 'backup-example-1',
        backupType: 'full',
        status: 'completed',
        createdAt: new Date().toISOString(),
        size: 1024 * 1024 * 50, // 50MB
        duration: 300000, // 5 minutes
        adminEmail: 'admin@wedsync.com',
        retentionUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    ],
    total: 1,
    hasMore: false,
  };
}

function generatePolicyId(): string {
  return `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
