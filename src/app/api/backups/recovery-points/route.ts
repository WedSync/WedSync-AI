/**
 * WS-191: Recovery Points API Route
 * Point-in-time recovery data with wedding milestone awareness
 * SECURITY: Super admin authentication with comprehensive validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { uuidSchema } from '@/lib/validation/schemas';
import { createClient } from '@supabase/supabase-js';

// Recovery points query schema
const recoveryPointsQuerySchema = z.object({
  organizationId: uuidSchema.optional(),
  weddingDate: z.string().date().optional(),
  timelinePhase: z
    .enum(['planning', 'preparation', 'execution', 'post_event'])
    .optional(),
  validationStatus: z
    .enum(['pending', 'validated', 'invalid', 'degraded'])
    .optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  includeMetadata: z.boolean().default(false),
  sortBy: z
    .enum(['timestamp', 'wedding_date', 'milestone_priority'])
    .default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Recovery point creation schema
const createRecoveryPointSchema = z.object({
  name: z.string().min(3).max(100),
  organizationId: uuidSchema.optional(),
  weddingMilestone: z.string().max(50).optional(),
  weddingDate: z.string().date().optional(),
  description: z.string().max(500).optional(),
  priority: z.enum(['critical', 'high', 'standard', 'low']).default('standard'),
});

type RecoveryPointsQuery = z.infer<typeof recoveryPointsQuerySchema>;
type CreateRecoveryPointRequest = z.infer<typeof createRecoveryPointSchema>;

/**
 * GET /api/backups/recovery-points - List available recovery points
 */
export const GET = withSecureValidation(
  recoveryPointsQuerySchema,
  async (request: NextRequest, validatedQuery: RecoveryPointsQuery) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    try {
      // Extract and validate query parameters from URL
      const url = new URL(request.url);
      const queryParams: any = {};

      url.searchParams.forEach((value, key) => {
        if (['limit', 'offset'].includes(key)) {
          queryParams[key] = parseInt(value);
        } else if (key === 'includeMetadata') {
          queryParams[key] = value === 'true';
        } else {
          queryParams[key] = value;
        }
      });

      const validatedData = recoveryPointsQuerySchema.parse(queryParams);

      // CRITICAL: Authentication and authorization
      const { user, userProfile } = await authenticateAndAuthorize(
        request,
        supabase,
      );

      // Build recovery points query
      let query = supabase.from('recovery_points').select(`
        id,
        recovery_point_name,
        recovery_type,
        recovery_timestamp,
        organization_id,
        wedding_milestone,
        milestone_priority,
        wedding_date,
        days_before_wedding,
        timeline_phase,
        source_backup_id,
        backup_location,
        validation_status,
        validation_timestamp,
        critical_data_complete,
        high_priority_complete,
        standard_data_complete,
        recovery_time_estimate_minutes,
        tables_included,
        data_size_bytes,
        created_at,
        updated_at
      `);

      // Apply organization filtering
      if (validatedData.organizationId) {
        if (
          !(await validateOrganizationAccess(
            user.id,
            validatedData.organizationId,
            userProfile.role,
            supabase,
          ))
        ) {
          return NextResponse.json(
            {
              error: 'FORBIDDEN',
              message: 'No access to specified organization recovery points',
              code: 'RECOVERY_POINTS_004',
            },
            { status: 403 },
          );
        }
        query = query.eq('organization_id', validatedData.organizationId);
      } else if (!['super_admin'].includes(userProfile.role)) {
        // Limit to user's organization if not super admin
        query = query.eq('organization_id', userProfile.organization_id);
      }

      // Apply additional filters
      if (validatedData.weddingDate) {
        query = query.eq('wedding_date', validatedData.weddingDate);
      }

      if (validatedData.timelinePhase) {
        query = query.eq('timeline_phase', validatedData.timelinePhase);
      }

      if (validatedData.validationStatus) {
        query = query.eq('validation_status', validatedData.validationStatus);
      }

      // Apply sorting
      const sortColumn =
        validatedData.sortBy === 'wedding_date'
          ? 'wedding_date'
          : validatedData.sortBy === 'milestone_priority'
            ? 'milestone_priority'
            : 'recovery_timestamp';

      query = query.order(sortColumn, {
        ascending: validatedData.sortOrder === 'asc',
      });

      // Apply pagination
      query = query.range(
        validatedData.offset,
        validatedData.offset + validatedData.limit - 1,
      );

      const { data: recoveryPoints, error: queryError } = await query;

      if (queryError) {
        console.error('Recovery points query failed:', queryError);
        return NextResponse.json(
          {
            error: 'QUERY_FAILED',
            message: 'Failed to retrieve recovery points',
            code: 'RECOVERY_POINTS_005',
          },
          { status: 500 },
        );
      }

      // Enhance recovery points with additional context
      const enhancedRecoveryPoints = await Promise.all(
        recoveryPoints.map(async (point) => {
          const enhanced: any = {
            id: point.id,
            name: point.recovery_point_name,
            type: point.recovery_type,
            timestamp: point.recovery_timestamp,
            organizationId: point.organization_id,
            weddingContext: {
              milestone: point.wedding_milestone,
              milestonePriority: point.milestone_priority,
              weddingDate: point.wedding_date,
              daysBeforeWedding: point.days_before_wedding,
              timelinePhase: point.timeline_phase,
            },
            dataCompleteness: {
              critical: point.critical_data_complete,
              high: point.high_priority_complete,
              standard: point.standard_data_complete,
              score: calculateCompletenessScore(point),
            },
            recovery: {
              estimatedTimeMinutes: point.recovery_time_estimate_minutes,
              estimatedTimePretty: formatDuration(
                point.recovery_time_estimate_minutes,
              ),
              validationStatus: point.validation_status,
              validatedAt: point.validation_timestamp,
              sourceBackupId: point.source_backup_id,
            },
            dataInfo: {
              sizeBytes: point.data_size_bytes,
              sizeFormatted: formatBytes(point.data_size_bytes),
              tablesIncluded: point.tables_included?.length || 0,
            },
            createdAt: point.created_at,
          };

          // Include detailed metadata if requested
          if (validatedData.includeMetadata) {
            enhanced.metadata = {
              backupLocation: point.backup_location,
              tablesIncluded: point.tables_included,
              updatedAt: point.updated_at,
            };

            // Get backup validation results if available
            const { data: backupTests } = await supabase
              .from('backup_tests')
              .select('test_type, status, data_integrity_score, completed_at')
              .eq('recovery_point_id', point.id)
              .order('completed_at', { ascending: false })
              .limit(3);

            enhanced.metadata.recentTests = backupTests || [];
          }

          // Add wedding urgency assessment
          if (point.wedding_date && point.days_before_wedding !== null) {
            enhanced.weddingContext.urgency = assessWeddingUrgency(
              point.days_before_wedding,
              point.timeline_phase,
            );
          }

          return enhanced;
        }),
      );

      // Get summary statistics
      const stats = await getRecoveryPointStats(
        validatedData.organizationId || userProfile.organization_id,
        supabase,
      );

      // Audit log
      await logAuditEvent(supabase, {
        action: 'recovery_points_accessed',
        userId: user.id,
        organizationId:
          validatedData.organizationId || userProfile.organization_id,
        details: {
          filters: validatedData,
          resultCount: enhancedRecoveryPoints.length,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        severity: 'low',
      });

      return NextResponse.json({
        success: true,
        recoveryPoints: enhancedRecoveryPoints,
        pagination: {
          offset: validatedData.offset,
          limit: validatedData.limit,
          hasMore: enhancedRecoveryPoints.length === validatedData.limit,
        },
        statistics: stats,
        metadata: {
          timestamp: new Date().toISOString(),
          userRole: userProfile.role,
          organizationScope:
            validatedData.organizationId || userProfile.organization_id,
        },
      });
    } catch (error) {
      console.error('Recovery points retrieval failed:', error);
      return NextResponse.json(
        {
          error: 'RECOVERY_POINTS_FAILED',
          message: 'Failed to retrieve recovery points',
          code: 'RECOVERY_POINTS_006',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

/**
 * POST /api/backups/recovery-points - Create new recovery point
 */
export const POST = withSecureValidation(
  createRecoveryPointSchema,
  async (request: NextRequest, validatedData: CreateRecoveryPointRequest) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    try {
      // Authentication and authorization
      const { user, userProfile } = await authenticateAndAuthorize(
        request,
        supabase,
        ['super_admin', 'system_admin'],
      );

      // Validate organization access if specified
      if (validatedData.organizationId) {
        if (
          !(await validateOrganizationAccess(
            user.id,
            validatedData.organizationId,
            userProfile.role,
            supabase,
          ))
        ) {
          return NextResponse.json(
            {
              error: 'FORBIDDEN',
              message:
                'No access to specified organization for recovery point creation',
              code: 'RECOVERY_POINTS_007',
            },
            { status: 403 },
          );
        }
      }

      // Validate wedding date if provided
      if (validatedData.weddingDate) {
        const weddingDate = new Date(validatedData.weddingDate);
        const now = new Date();
        const maxFuture = new Date();
        maxFuture.setFullYear(maxFuture.getFullYear() + 2);

        if (weddingDate < now || weddingDate > maxFuture) {
          return NextResponse.json(
            {
              error: 'INVALID_WEDDING_DATE',
              message:
                'Wedding date must be between now and 2 years in the future',
              code: 'RECOVERY_POINTS_008',
            },
            { status: 400 },
          );
        }
      }

      // Generate recovery point ID and timestamp
      const recoveryPointId = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const timestamp = new Date();

      // Calculate wedding timeline context
      let daysBeforeWedding: number | null = null;
      let timelinePhase: string = 'planning';

      if (validatedData.weddingDate) {
        const weddingDate = new Date(validatedData.weddingDate);
        daysBeforeWedding = Math.ceil(
          (weddingDate.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysBeforeWedding <= 0) {
          timelinePhase = 'post_event';
        } else if (daysBeforeWedding <= 1) {
          timelinePhase = 'execution';
        } else if (daysBeforeWedding <= 30) {
          timelinePhase = 'preparation';
        }
      }

      // Assess current data completeness
      const dataCompleteness = await assessDataCompleteness(
        validatedData.organizationId,
        supabase,
      );

      // Estimate recovery time based on data scope
      const estimatedRecoveryTime = estimateRecoveryTime(
        dataCompleteness,
        daysBeforeWedding,
      );

      // Create recovery point record
      const { data: recoveryPoint, error: insertError } = await supabase
        .from('recovery_points')
        .insert({
          id: recoveryPointId,
          recovery_point_name: validatedData.name,
          recovery_type: validatedData.weddingMilestone
            ? 'milestone'
            : 'manual',
          recovery_timestamp: timestamp.toISOString(),
          organization_id: validatedData.organizationId,
          wedding_milestone: validatedData.weddingMilestone,
          wedding_date: validatedData.weddingDate,
          days_before_wedding: daysBeforeWedding,
          timeline_phase: timelinePhase,
          source_backup_id: `backup_${recoveryPointId}`,
          critical_data_complete: dataCompleteness.critical,
          high_priority_complete: dataCompleteness.high,
          standard_data_complete: dataCompleteness.standard,
          recovery_time_estimate_minutes: estimatedRecoveryTime,
          validation_status: 'pending',
          tables_included: dataCompleteness.availableTables,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Recovery point creation failed:', insertError);
        return NextResponse.json(
          {
            error: 'CREATION_FAILED',
            message: 'Failed to create recovery point',
            code: 'RECOVERY_POINTS_009',
          },
          { status: 500 },
        );
      }

      // Audit log
      await logAuditEvent(supabase, {
        action: 'recovery_point_created',
        userId: user.id,
        organizationId: validatedData.organizationId,
        details: {
          recoveryPointId,
          name: validatedData.name,
          weddingMilestone: validatedData.weddingMilestone,
          weddingDate: validatedData.weddingDate,
          priority: validatedData.priority,
          estimatedRecoveryTime,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        severity: 'medium',
      });

      // Return created recovery point with enhanced information
      const response = {
        success: true,
        recoveryPoint: {
          id: recoveryPoint.id,
          name: recoveryPoint.recovery_point_name,
          timestamp: recoveryPoint.recovery_timestamp,
          organizationId: recoveryPoint.organization_id,
          weddingContext: {
            milestone: recoveryPoint.wedding_milestone,
            weddingDate: recoveryPoint.wedding_date,
            daysBeforeWedding: recoveryPoint.days_before_wedding,
            timelinePhase: recoveryPoint.timeline_phase,
            urgency: daysBeforeWedding
              ? assessWeddingUrgency(daysBeforeWedding, timelinePhase)
              : 'low',
          },
          dataCompleteness: {
            critical: recoveryPoint.critical_data_complete,
            high: recoveryPoint.high_priority_complete,
            standard: recoveryPoint.standard_data_complete,
            score: calculateCompletenessScore(recoveryPoint),
          },
          recovery: {
            estimatedTimeMinutes: recoveryPoint.recovery_time_estimate_minutes,
            estimatedTimePretty: formatDuration(
              recoveryPoint.recovery_time_estimate_minutes,
            ),
            validationStatus: recoveryPoint.validation_status,
          },
          createdAt: recoveryPoint.created_at,
        },
        nextSteps: [
          'Recovery point validation will begin automatically',
          'Backup data will be prepared for point-in-time recovery',
          'Wedding timeline impact will be assessed',
          'Recovery procedures will be optimized based on wedding proximity',
        ],
      };

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error('Recovery point creation failed:', error);
      return NextResponse.json(
        {
          error: 'RECOVERY_POINT_CREATION_FAILED',
          message: 'Failed to create recovery point',
          code: 'RECOVERY_POINTS_010',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

// Helper functions
async function authenticateAndAuthorize(
  request: NextRequest,
  supabase: any,
  allowedRoles?: string[],
): Promise<{ user: any; userProfile: any }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Authentication token required');
  }

  const token = authHeader.split(' ')[1];
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error('Invalid authentication token');
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (!userProfile) {
    throw new Error('User profile not found');
  }

  const defaultAllowedRoles = [
    'super_admin',
    'system_admin',
    'admin',
    'organization_admin',
  ];
  const roles = allowedRoles || defaultAllowedRoles;

  if (!roles.includes(userProfile.role)) {
    throw new Error('Insufficient privileges');
  }

  return { user, userProfile };
}

async function validateOrganizationAccess(
  userId: string,
  organizationId: string,
  userRole: string,
  supabase: any,
): Promise<boolean> {
  if (userRole === 'super_admin') return true;

  try {
    const { data: membership } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', userId)
      .single();

    return (
      membership?.organization_id === organizationId &&
      ['admin', 'organization_admin'].includes(membership.role)
    );
  } catch (error) {
    return false;
  }
}

function calculateCompletenessScore(recoveryPoint: any): number {
  let score = 0;
  if (recoveryPoint.critical_data_complete) score += 50;
  if (recoveryPoint.high_priority_complete) score += 30;
  if (recoveryPoint.standard_data_complete) score += 20;
  return score;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'Unknown';

  if (minutes < 60) {
    return `${minutes} minutes`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hours`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
  }
}

function assessWeddingUrgency(
  daysBeforeWedding: number,
  timelinePhase: string,
): string {
  if (daysBeforeWedding <= 0) return 'post_event';
  if (daysBeforeWedding <= 1) return 'critical';
  if (daysBeforeWedding <= 7) return 'high';
  if (daysBeforeWedding <= 30) return 'medium';
  return 'low';
}

async function assessDataCompleteness(
  organizationId: string | undefined,
  supabase: any,
): Promise<{
  critical: boolean;
  high: boolean;
  standard: boolean;
  availableTables: string[];
}> {
  const criticalTables = ['users', 'suppliers', 'clients', 'organizations'];
  const highTables = [
    'forms',
    'journey_instances',
    'audit_logs',
    'files',
    'payments',
  ];
  const standardTables = ['communications', 'user_profiles', 'event_logs'];

  const availableTables: string[] = [];
  let criticalComplete = true;
  let highComplete = true;
  let standardComplete = true;

  // Check each table for data availability
  for (const table of [...criticalTables, ...highTables, ...standardTables]) {
    try {
      let query = supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (
        organizationId &&
        [
          'suppliers',
          'clients',
          'forms',
          'journey_instances',
          'files',
          'communications',
        ].includes(table)
      ) {
        query = query.eq('organization_id', organizationId);
      }

      const { count } = await query;

      if (count && count > 0) {
        availableTables.push(table);
      } else {
        if (criticalTables.includes(table)) criticalComplete = false;
        if (highTables.includes(table)) highComplete = false;
        if (standardTables.includes(table)) standardComplete = false;
      }
    } catch (error) {
      if (criticalTables.includes(table)) criticalComplete = false;
      if (highTables.includes(table)) highComplete = false;
      if (standardTables.includes(table)) standardComplete = false;
    }
  }

  return {
    critical: criticalComplete,
    high: highComplete,
    standard: standardComplete,
    availableTables,
  };
}

function estimateRecoveryTime(
  dataCompleteness: any,
  daysBeforeWedding: number | null,
): number {
  let baseTime = 30; // Base 30 minutes

  // Add time based on data availability
  baseTime += dataCompleteness.availableTables.length * 2;

  // Wedding urgency adjustments
  if (daysBeforeWedding !== null) {
    if (daysBeforeWedding <= 1) {
      baseTime *= 0.5; // Emergency parallel recovery
    } else if (daysBeforeWedding <= 7) {
      baseTime *= 0.75; // High priority mode
    }
  }

  return Math.round(baseTime);
}

async function getRecoveryPointStats(
  organizationId: string | undefined,
  supabase: any,
): Promise<any> {
  try {
    let query = supabase
      .from('recovery_points')
      .select('validation_status, timeline_phase, created_at');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: points } = await query;

    if (!points) return {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return {
      total: points.length,
      byValidationStatus: {
        validated: points.filter((p) => p.validation_status === 'validated')
          .length,
        pending: points.filter((p) => p.validation_status === 'pending').length,
        invalid: points.filter((p) => p.validation_status === 'invalid').length,
        degraded: points.filter((p) => p.validation_status === 'degraded')
          .length,
      },
      byTimelinePhase: {
        planning: points.filter((p) => p.timeline_phase === 'planning').length,
        preparation: points.filter((p) => p.timeline_phase === 'preparation')
          .length,
        execution: points.filter((p) => p.timeline_phase === 'execution')
          .length,
        postEvent: points.filter((p) => p.timeline_phase === 'post_event')
          .length,
      },
      recentlyCreated: points.filter(
        (p) => new Date(p.created_at) > thirtyDaysAgo,
      ).length,
    };
  } catch (error) {
    console.error('Failed to get recovery point stats:', error);
    return {};
  }
}

async function logAuditEvent(
  supabase: any,
  event: {
    action: string;
    userId: string;
    organizationId?: string;
    details: any;
    ipAddress: string;
    severity: 'low' | 'medium' | 'high';
  },
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      table_name: 'recovery_points',
      operation: event.action,
      user_id: event.userId,
      organization_id: event.organizationId,
      new_data: {
        details: event.details,
        severity: event.severity,
        ipAddress: event.ipAddress,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}
