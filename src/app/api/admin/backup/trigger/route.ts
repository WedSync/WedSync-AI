import { NextRequest, NextResponse } from 'next/server';
import { BackupScheduler } from '@/lib/backup/backup-scheduler';
import { BackupSecurityMiddleware } from '@/lib/middleware/backup-security';
import { BackupValidator } from '@/lib/security/backup-validator';
import { z } from 'zod';

/**
 * Manual Backup Trigger API
 *
 * POST /api/admin/backup/trigger - Trigger immediate backup
 *
 * Security: Admin authentication required
 * Rate limiting: 3 manual triggers per hour
 * Audit logging: All trigger attempts logged
 */

const triggerBackupSchema = z.object({
  backupType: z.enum(['full', 'incremental', 'config'], {
    errorMap: () => ({
      message: 'Backup type must be full, incremental, or config',
    }),
  }),
  immediate: z.boolean().default(true),
  description: z.string().max(500, 'Description too long').optional(),
  includeMedia: z.boolean().default(true),
  includeDatabase: z.boolean().default(true),
  includeConfig: z.boolean().default(false),
  retentionDays: z
    .number()
    .int('Retention days must be integer')
    .min(1, 'Retention must be at least 1 day')
    .max(365, 'Retention cannot exceed 365 days')
    .default(30),
});

const backupScheduler = new BackupScheduler();

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
        operation: 'backup_trigger',
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

    // Enhanced rate limiting for manual triggers
    const rateLimitResult = await BackupSecurityMiddleware.checkRateLimit(
      'backup_create', // Using same rate limit as create
      admin.id,
    );

    if (!rateLimitResult.allowed) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_trigger',
        success: false,
        errorCode: 'RATE_LIMITED',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });

      return BackupSecurityMiddleware.createErrorResponse(
        `Manual backup rate limit exceeded. Try again in ${Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000)} seconds.`,
        429,
        'RATE_LIMITED',
      );
    }

    // Parse and validate request body
    try {
      requestBody = await request.json();
    } catch (error) {
      return BackupSecurityMiddleware.createErrorResponse(
        'Invalid JSON in request body',
        400,
        'INVALID_JSON',
      );
    }

    // Validate trigger request
    const validation = validateTriggerRequest(requestBody);
    if (!validation.success) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_trigger',
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

    // Check for existing running backups
    const runningBackups = await checkRunningBackups(organizationId);
    if (runningBackups.length > 0) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_trigger',
        success: false,
        errorCode: 'BACKUP_IN_PROGRESS',
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });

      return BackupSecurityMiddleware.createErrorResponse(
        `Cannot trigger backup while another backup is in progress. Running backup: ${runningBackups[0].id}`,
        409,
        'BACKUP_IN_PROGRESS',
      );
    }

    // Create high-priority backup policy for manual trigger
    const triggerPolicy = {
      id: generateTriggerPolicyId(),
      organizationId,
      policyName: `Manual trigger - ${validatedData.backupType} - ${new Date().toLocaleString()}`,
      backupType: validatedData.backupType,
      frequencyType: 'manual' as const,
      frequencyValue: 1,
      backupTime: new Date().toTimeString().substring(0, 5),
      timezone: 'UTC',
      retentionDays: validatedData.retentionDays,
      includeUserData: validatedData.includeDatabase,
      includeMediaFiles: validatedData.includeMedia,
      includeDocuments: true,
      includeAnalytics: validatedData.includeConfig,
      exclusionPatterns: [],
      isActive: true,
      priority: 1, // High priority for manual triggers
      description:
        validatedData.description ||
        `Manual ${validatedData.backupType} backup triggered by ${admin.email}`,
    };

    // Schedule the backup with immediate execution
    const backupJob = await backupScheduler.scheduleBackup(
      organizationId,
      triggerPolicy,
    );

    // For immediate backups, start execution asynchronously
    if (validatedData.immediate) {
      // Execute backup in background
      backupScheduler
        .executeBackup(backupJob.id)
        .then(async (result) => {
          // Log completion
          await BackupSecurityMiddleware.logAuditEvent({
            adminId: admin.id,
            adminEmail: admin.email,
            operation: 'backup_completed',
            backupType: validatedData.backupType,
            success: result.success,
            duration: result.duration,
            fileSize: result.totalSize,
            ipAddress: request.ip,
            userAgent: request.headers.get('user-agent'),
          });

          // Send completion notification (implement based on your notification system)
          await sendBackupCompletionNotification(admin.email, result);
        })
        .catch(async (error) => {
          // Log failure
          await BackupSecurityMiddleware.logAuditEvent({
            adminId: admin.id,
            adminEmail: admin.email,
            operation: 'backup_failed',
            backupType: validatedData.backupType,
            success: false,
            errorCode: 'EXECUTION_FAILED',
            ipAddress: request.ip,
            userAgent: request.headers.get('user-agent'),
          });

          // Send failure notification
          await sendBackupFailureNotification(admin.email, error);
        });
    }

    const duration = Date.now() - startTime;

    // Log successful trigger
    await BackupSecurityMiddleware.logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      operation: 'backup_trigger',
      backupType: validatedData.backupType,
      success: true,
      duration,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    // Return immediate response
    return BackupSecurityMiddleware.createSuccessResponse(
      {
        message: 'Backup triggered successfully',
        backupJobId: backupJob.id,
        backupType: validatedData.backupType,
        status: validatedData.immediate ? 'executing' : 'scheduled',
        estimatedDuration: getEstimatedDuration(validatedData.backupType),
        scheduledAt: backupJob.scheduledAt,
        priority: 1,
        statusEndpoint: `/api/admin/backup/status/${backupJob.id}`,
        description: triggerPolicy.description,
      },
      202,
    ); // 202 Accepted for async operation
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Log failed operation
    if (admin) {
      await BackupSecurityMiddleware.logAuditEvent({
        adminId: admin.id,
        adminEmail: admin.email,
        operation: 'backup_trigger',
        backupType: requestBody?.backupType,
        success: false,
        errorCode: 'INTERNAL_ERROR',
        duration,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
      });
    }

    console.error('Backup trigger API error:', error);

    return BackupSecurityMiddleware.createErrorResponse(
      'Failed to trigger backup',
      500,
      'INTERNAL_ERROR',
    );
  }
}

// Additional endpoints for backup trigger management

/**
 * GET /api/admin/backup/trigger - Get manual trigger history
 */
export async function GET(request: NextRequest) {
  try {
    // Admin authentication
    const authResult =
      await BackupSecurityMiddleware.validateAdminAccess(request);
    if (!authResult.isValid) {
      return BackupSecurityMiddleware.createErrorResponse(
        authResult.error || 'Authentication required',
        401,
        'AUTH_FAILED',
      );
    }

    const admin = authResult.admin!;

    // Get organization ID
    const organizationId = await getOrganizationIdForAdmin(admin.id);
    if (!organizationId) {
      return BackupSecurityMiddleware.createErrorResponse(
        'Organization not found for admin',
        404,
        'ORG_NOT_FOUND',
      );
    }

    // Get manual trigger history
    const triggerHistory = await getManualTriggerHistory(
      organizationId,
      admin.id,
    );

    return BackupSecurityMiddleware.createSuccessResponse({
      triggers: triggerHistory,
      summary: {
        totalTriggers: triggerHistory.length,
        successfulTriggers: triggerHistory.filter((t) => t.success).length,
        failedTriggers: triggerHistory.filter((t) => !t.success).length,
        lastTrigger:
          triggerHistory.length > 0 ? triggerHistory[0].triggeredAt : null,
      },
    });
  } catch (error) {
    console.error('Trigger history API error:', error);
    return BackupSecurityMiddleware.createErrorResponse(
      'Failed to retrieve trigger history',
      500,
      'INTERNAL_ERROR',
    );
  }
}

// Helper functions

function validateTriggerRequest(body: any): {
  success: boolean;
  data?: z.infer<typeof triggerBackupSchema>;
  errors?: string[];
} {
  try {
    const validated = triggerBackupSchema.parse(body);

    // Additional business logic validation
    const errors: string[] = [];

    // Validate backup type combinations
    if (validated.backupType === 'config' && !validated.includeConfig) {
      errors.push('Config backup type requires includeConfig to be true');
    }

    if (validated.backupType === 'incremental' && !validated.includeDatabase) {
      errors.push('Incremental backup requires database inclusion');
    }

    // Validate description for certain backup types
    if (validated.backupType === 'full' && !validated.description) {
      validated.description = 'Manual full backup triggered by admin';
    }

    return {
      success: errors.length === 0,
      data: errors.length === 0 ? validated : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`,
        ),
      };
    }

    return {
      success: false,
      errors: ['Validation failed'],
    };
  }
}

async function getOrganizationIdForAdmin(
  adminId: string,
): Promise<string | null> {
  // Implement based on your user/organization model
  return 'org-placeholder-id';
}

async function checkRunningBackups(organizationId: string): Promise<any[]> {
  // Check for any running backups for the organization
  // This would query your backup_jobs table
  return [];
}

async function getManualTriggerHistory(
  organizationId: string,
  adminId: string,
): Promise<any[]> {
  // Get history of manual backup triggers
  // This would query your backup audit logs
  return [
    {
      id: 'trigger-1',
      backupType: 'full',
      triggeredAt: new Date().toISOString(),
      triggeredBy: adminId,
      success: true,
      duration: 300000,
      backupSize: 1024 * 1024 * 100,
    },
  ];
}

function generateTriggerPolicyId(): string {
  return `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getEstimatedDuration(backupType: string): number {
  // Return estimated duration in milliseconds based on backup type
  switch (backupType) {
    case 'full':
      return 15 * 60 * 1000; // 15 minutes
    case 'incremental':
      return 5 * 60 * 1000; // 5 minutes
    case 'config':
      return 2 * 60 * 1000; // 2 minutes
    default:
      return 10 * 60 * 1000; // 10 minutes
  }
}

async function sendBackupCompletionNotification(
  adminEmail: string,
  result: any,
): Promise<void> {
  // Implement notification system integration
  console.log(`Backup completed notification sent to ${adminEmail}:`, {
    success: result.success,
    backupId: result.backupId,
    duration: result.duration,
    size: result.totalSize,
  });
}

async function sendBackupFailureNotification(
  adminEmail: string,
  error: any,
): Promise<void> {
  // Implement failure notification
  console.log(`Backup failure notification sent to ${adminEmail}:`, {
    error: error.message,
    timestamp: new Date().toISOString(),
  });
}
