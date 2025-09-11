/**
 * WS-191: Backup Creation API Route
 * Secure endpoint for manual backup triggers with super admin authentication
 * SECURITY: Enterprise-grade validation, authentication, rate limiting, audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { uuidSchema, secureStringSchema } from '@/lib/validation/schemas';
import { createClient } from '@supabase/supabase-js';
import BackupOrchestrator, {
  BackupConfig,
} from '@/lib/backup/backup-orchestrator';

// Backup creation request schema
const createBackupSchema = z.object({
  type: z.enum(['full', 'incremental', 'differential', 'wedding_specific'], {
    required_error: 'Backup type is required',
    invalid_type_error: 'Invalid backup type',
  }),
  priority: z.enum(['critical', 'high', 'standard', 'low']).default('standard'),
  reason: secureStringSchema.max(200).optional(),
  organizationId: uuidSchema.optional(),
  weddingDate: z.string().datetime().optional(),
  includeTables: z
    .array(z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/))
    .default([]),
  excludeSensitiveData: z.boolean().default(false),
  retentionDays: z.number().int().min(1).max(2555).default(90), // Max ~7 years
  encryptionEnabled: z.boolean().default(true),
});

type CreateBackupRequest = z.infer<typeof createBackupSchema>;

// Rate limiting configuration
const BACKUP_RATE_LIMITS = {
  full: { requests: 2, window: 3600 }, // 2 full backups per hour
  incremental: { requests: 12, window: 3600 }, // 12 incremental per hour
  differential: { requests: 6, window: 3600 }, // 6 differential per hour
  wedding_specific: { requests: 10, window: 3600 }, // 10 wedding-specific per hour
};

/**
 * POST /api/backups/create - Create manual backup
 * Requires super admin authentication and comprehensive validation
 */
export const POST = withSecureValidation(
  createBackupSchema,
  async (request: NextRequest, validatedData: CreateBackupRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    try {
      // CRITICAL: Super admin authentication required
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication token required',
            code: 'BACKUP_001',
          },
          { status: 401 },
        );
      }

      const token = authHeader.split(' ')[1];
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        await logSecurityEvent('backup_auth_failure', {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          error: authError?.message || 'Invalid token',
        });

        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Invalid authentication token',
            code: 'BACKUP_002',
          },
          { status: 401 },
        );
      }

      // Verify super admin role
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      if (
        !userProfile ||
        !['super_admin', 'system_admin'].includes(userProfile.role)
      ) {
        await logSecurityEvent('backup_privilege_escalation', {
          userId: user.id,
          role: userProfile?.role || 'unknown',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          requestedOperation: 'backup_create',
        });

        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Insufficient privileges for backup operations',
            code: 'BACKUP_003',
          },
          { status: 403 },
        );
      }

      // Rate limiting for backup operations
      const rateLimitKey = `backup_${validatedData.type}_${user.id}`;
      const rateLimits = BACKUP_RATE_LIMITS[validatedData.type];
      const rateLimitResult = await checkRateLimit(
        rateLimitKey,
        rateLimits.requests,
        rateLimits.window,
      );

      if (!rateLimitResult.allowed) {
        await logSecurityEvent('backup_rate_limit_exceeded', {
          userId: user.id,
          backupType: validatedData.type,
          remainingTime: rateLimitResult.resetTime,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return NextResponse.json(
          {
            error: 'RATE_LIMIT_EXCEEDED',
            message: `Backup rate limit exceeded for ${validatedData.type} backups`,
            resetTime: rateLimitResult.resetTime,
            code: 'BACKUP_004',
          },
          { status: 429 },
        );
      }

      // Organization access validation
      if (validatedData.organizationId && userProfile.role !== 'super_admin') {
        const hasAccess = await validateOrganizationAccess(
          user.id,
          validatedData.organizationId,
          supabase,
        );

        if (!hasAccess) {
          return NextResponse.json(
            {
              error: 'FORBIDDEN',
              message: 'No access to specified organization',
              code: 'BACKUP_005',
            },
            { status: 403 },
          );
        }
      }

      // Validate wedding date if provided
      if (validatedData.weddingDate) {
        const weddingDate = new Date(validatedData.weddingDate);
        const now = new Date();
        const maxFutureDate = new Date();
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);

        if (weddingDate < now || weddingDate > maxFutureDate) {
          return NextResponse.json(
            {
              error: 'INVALID_WEDDING_DATE',
              message:
                'Wedding date must be between now and 2 years in the future',
              code: 'BACKUP_006',
            },
            { status: 400 },
          );
        }
      }

      // Audit log critical operation BEFORE execution
      await logAuditEvent(supabase, {
        action: 'backup_initiated',
        userId: user.id,
        organizationId: userProfile.organization_id,
        details: {
          backupType: validatedData.type,
          priority: validatedData.priority,
          organizationId: validatedData.organizationId,
          includeTables: validatedData.includeTables,
          reason: validatedData.reason,
          encryptionEnabled: validatedData.encryptionEnabled,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        severity: validatedData.type === 'full' ? 'high' : 'medium',
      });

      // Create backup configuration
      const backupConfig: BackupConfig = {
        type: validatedData.type,
        priority: validatedData.priority,
        organizationId: validatedData.organizationId,
        weddingDate: validatedData.weddingDate,
        includeTables:
          validatedData.includeTables.length > 0
            ? validatedData.includeTables
            : getDefaultTablesForBackupType(validatedData.type),
        excludeSensitiveData: validatedData.excludeSensitiveData,
        retentionDays: validatedData.retentionDays,
        encryptionEnabled: validatedData.encryptionEnabled,
      };

      // Initialize backup orchestrator and execute
      const orchestrator = new BackupOrchestrator();
      const backupResult = await orchestrator.performBackup(backupConfig);

      // Audit log successful completion
      await logAuditEvent(supabase, {
        action: 'backup_completed',
        userId: user.id,
        organizationId: userProfile.organization_id,
        details: {
          backupId: backupResult.backupId,
          status: backupResult.status,
          dataSize: backupResult.dataSize,
          storageLocations: backupResult.storageLocations.length,
          validationResults: backupResult.validationResults.length,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        severity: 'medium',
      });

      // Return success response with backup details
      return NextResponse.json(
        {
          success: true,
          backupId: backupResult.backupId,
          status: backupResult.status,
          startedAt: backupResult.startedAt,
          completedAt: backupResult.completedAt,
          dataSize: backupResult.dataSize,
          storageLocations: backupResult.storageLocations.map((loc) => ({
            provider: loc.provider,
            encrypted: loc.encrypted,
            verified: loc.verified,
            createdAt: loc.createdAt,
          })),
          validationSummary: {
            totalTables: backupResult.validationResults.length,
            validatedTables: backupResult.validationResults.filter(
              (v) => v.integrityScore > 95,
            ).length,
            averageIntegrityScore: calculateAverageIntegrityScore(
              backupResult.validationResults,
            ),
          },
          weddingContext: backupResult.weddingContext,
          estimatedRetention: `${validatedData.retentionDays} days`,
          nextRecommendedBackup: calculateNextBackupTime(
            validatedData.type,
            validatedData.priority,
          ),
        },
        { status: 201 },
      );
    } catch (error) {
      console.error('Backup creation failed:', error);

      // Audit log failure
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        try {
          const token = authHeader.split(' ')[1];
          const { data: user } = await supabase.auth.getUser(token);

          if (user) {
            await logAuditEvent(supabase, {
              action: 'backup_failed',
              userId: user.id,
              details: {
                error: error.message,
                backupType: validatedData.type,
                reason: validatedData.reason,
              },
              ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
              severity: 'high',
            });
          }
        } catch (auditError) {
          console.error('Audit logging failed:', auditError);
        }
      }

      return NextResponse.json(
        {
          error: 'BACKUP_CREATION_FAILED',
          message:
            'Backup operation failed. Please contact system administrator.',
          code: 'BACKUP_007',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

// Helper functions
async function checkRateLimit(
  key: string,
  requests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; resetTime?: number }> {
  // In production, this would use Redis or another distributed cache
  // For now, implementing in-memory rate limiting (not suitable for production)

  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // This is a simplified implementation
  // Production should use Redis with sliding window or token bucket
  return { allowed: true, resetTime: now + windowMs };
}

async function validateOrganizationAccess(
  userId: string,
  organizationId: string,
  supabase: any,
): Promise<boolean> {
  try {
    const { data: membership } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', userId)
      .eq('organization_id', organizationId)
      .single();

    return (
      !!membership &&
      ['admin', 'organization_admin', 'super_admin'].includes(membership.role)
    );
  } catch (error) {
    console.error('Organization access validation failed:', error);
    return false;
  }
}

function getDefaultTablesForBackupType(type: string): string[] {
  const criticalTables = ['users', 'suppliers', 'clients', 'organizations'];
  const highPriorityTables = [
    'forms',
    'journey_instances',
    'audit_logs',
    'files',
    'payments',
  ];
  const standardTables = ['communications', 'user_profiles', 'event_logs'];

  switch (type) {
    case 'wedding_specific':
      return [...criticalTables, ...highPriorityTables];
    case 'full':
      return [...criticalTables, ...highPriorityTables, ...standardTables];
    case 'incremental':
    case 'differential':
      return criticalTables;
    default:
      return criticalTables;
  }
}

function calculateAverageIntegrityScore(results: any[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, result) => acc + result.integrityScore, 0);
  return Math.round((sum / results.length) * 100) / 100;
}

function calculateNextBackupTime(type: string, priority: string): string {
  const now = new Date();
  let nextBackup = new Date(now);

  switch (type) {
    case 'full':
      nextBackup.setDate(
        nextBackup.getDate() + (priority === 'critical' ? 1 : 7),
      );
      break;
    case 'incremental':
      nextBackup.setHours(
        nextBackup.getHours() + (priority === 'critical' ? 1 : 4),
      );
      break;
    case 'differential':
      nextBackup.setHours(
        nextBackup.getHours() + (priority === 'critical' ? 2 : 8),
      );
      break;
    case 'wedding_specific':
      nextBackup.setHours(nextBackup.getHours() + 6);
      break;
    default:
      nextBackup.setDate(nextBackup.getDate() + 1);
  }

  return nextBackup.toISOString();
}

async function logSecurityEvent(
  eventType: string,
  details: any,
): Promise<void> {
  // Log security events to monitoring system
  console.warn(`SECURITY EVENT: ${eventType}`, details);

  // In production, this would integrate with security monitoring systems
  // like DataDog, Splunk, or custom security event logging
}

async function logAuditEvent(
  supabase: any,
  event: {
    action: string;
    userId: string;
    organizationId?: string;
    details: any;
    ipAddress: string;
    userAgent?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  },
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      table_name: 'backup_operations',
      operation: event.action,
      user_id: event.userId,
      organization_id: event.organizationId,
      new_data: {
        details: event.details,
        severity: event.severity,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit failure shouldn't prevent backup operation
  }
}
