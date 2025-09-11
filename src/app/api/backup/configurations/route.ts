/**
 * WS-258: Backup Strategy Implementation System
 * Team B: Backend API Development
 *
 * Backup Configuration Management API
 * Handles creation, listing, and management of backup configurations
 *
 * Endpoints:
 * POST   /api/backup/configurations              // Create backup configuration
 * GET    /api/backup/configurations              // List backup configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// =====================================================================================
// VALIDATION SCHEMAS
// =====================================================================================

const BackupConfigurationSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  backup_type: z.enum(['full', 'incremental', 'differential']),
  source_type: z.enum(['database', 'files', 'application', 'wedding_data']),
  source_identifier: z.string().min(1),
  backup_frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  backup_schedule: z
    .object({
      hour: z.string().optional(),
      day_of_week: z.string().optional(),
      day_of_month: z.string().optional(),
      timezone: z.string().default('UTC'),
    })
    .optional()
    .default({}),
  retention_policy: z
    .object({
      local_retention_days: z.number().min(1).optional(),
      cloud_retention_days: z.number().min(7).optional(),
      archive_retention_days: z.number().min(30).optional(),
      legal_hold_enabled: z.boolean().default(false),
    })
    .optional()
    .default({}),
  encryption_enabled: z.boolean().default(true),
  compression_enabled: z.boolean().default(true),
  storage_destinations: z
    .object({
      local: z.boolean().default(false),
      cloud_primary: z.boolean().default(true),
      cloud_secondary: z.boolean().default(false),
      offsite: z.boolean().default(false),
    })
    .optional()
    .default({}),
  is_wedding_critical: z.boolean().default(false),
});

const BackupConfigurationQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50'),
  backup_type: z.enum(['full', 'incremental', 'differential']).optional(),
  source_type: z
    .enum(['database', 'files', 'application', 'wedding_data'])
    .optional(),
  is_wedding_critical: z.string().transform(Boolean).optional(),
  is_active: z.string().transform(Boolean).optional(),
  search: z.string().optional(),
});

// =====================================================================================
// TYPES
// =====================================================================================

interface BackupConfiguration {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  backup_type: 'full' | 'incremental' | 'differential';
  source_type: 'database' | 'files' | 'application' | 'wedding_data';
  source_identifier: string;
  backup_frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  backup_schedule: Record<string, unknown>;
  retention_policy: Record<string, unknown>;
  encryption_enabled: boolean;
  encryption_key_id?: string;
  compression_enabled: boolean;
  storage_destinations: Record<string, unknown>;
  is_wedding_critical: boolean;
  is_active: boolean;
  backup_size_estimate: number;
  last_backup_at?: string;
  next_backup_at?: string;
  configuration_version: number;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

async function validateUserAccess(
  supabase: any,
): Promise<{ user: any; organization_id: string } | null> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return null;
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('Profile lookup error:', profileError);
      return null;
    }

    return { user, organization_id: profile.organization_id };
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
}

function generateEncryptionKeyId(
  organization_id: string,
  config_name: string,
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `backup_key_${organization_id.substring(0, 8)}_${config_name.replace(/\s+/g, '_')}_${timestamp}_${randomSuffix}`;
}

function calculateNextBackupTime(
  frequency: string,
  schedule: Record<string, unknown>,
): Date {
  const now = new Date();
  let nextBackup = new Date(now);

  switch (frequency) {
    case 'hourly':
      nextBackup.setHours(now.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      nextBackup.setDate(now.getDate() + 1);
      nextBackup.setHours(
        parseInt((schedule.hour as string) || '2', 10),
        0,
        0,
        0,
      );
      break;
    case 'weekly':
      const dayOfWeek = parseInt((schedule.day_of_week as string) || '0', 10);
      const daysUntilNext = (7 - now.getDay() + dayOfWeek) % 7 || 7;
      nextBackup.setDate(now.getDate() + daysUntilNext);
      nextBackup.setHours(
        parseInt((schedule.hour as string) || '2', 10),
        0,
        0,
        0,
      );
      break;
    case 'monthly':
      nextBackup.setMonth(
        now.getMonth() + 1,
        parseInt((schedule.day_of_month as string) || '1', 10),
      );
      nextBackup.setHours(
        parseInt((schedule.hour as string) || '2', 10),
        0,
        0,
        0,
      );
      break;
    default:
      nextBackup.setDate(now.getDate() + 1); // Default to daily
  }

  return nextBackup;
}

// =====================================================================================
// POST - CREATE BACKUP CONFIGURATION
// =====================================================================================

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<BackupConfiguration>>> {
  try {
    const supabase = await createClient();

    // Validate user authentication and authorization
    const userAccess = await validateUserAccess(supabase);
    if (!userAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid authentication or organization access',
        },
        { status: 401 },
      );
    }

    const { user, organization_id } = userAccess;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = BackupConfigurationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validationResult.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', '),
        },
        { status: 400 },
      );
    }

    const configData = validationResult.data;

    // Check for duplicate configuration names within organization
    const { data: existingConfig } = await supabase
      .from('backup_configurations')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('name', configData.name)
      .single();

    if (existingConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration name already exists',
          message: `A backup configuration named "${configData.name}" already exists in your organization`,
        },
        { status: 409 },
      );
    }

    // Generate encryption key ID if encryption is enabled
    let encryption_key_id = null;
    if (configData.encryption_enabled) {
      encryption_key_id = generateEncryptionKeyId(
        organization_id,
        configData.name,
      );
    }

    // Calculate next backup time
    const next_backup_at = calculateNextBackupTime(
      configData.backup_frequency,
      configData.backup_schedule,
    );

    // Create backup configuration
    const { data: newConfig, error: insertError } = await supabase
      .from('backup_configurations')
      .insert({
        organization_id,
        name: configData.name,
        description: configData.description,
        backup_type: configData.backup_type,
        source_type: configData.source_type,
        source_identifier: configData.source_identifier,
        backup_frequency: configData.backup_frequency,
        backup_schedule: configData.backup_schedule,
        retention_policy: configData.retention_policy,
        encryption_enabled: configData.encryption_enabled,
        encryption_key_id,
        compression_enabled: configData.compression_enabled,
        storage_destinations: configData.storage_destinations,
        is_wedding_critical: configData.is_wedding_critical,
        next_backup_at: next_backup_at.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create backup configuration',
          message: insertError.message,
        },
        { status: 500 },
      );
    }

    // Log the creation for audit purposes
    await supabase.from('backup_system_monitoring').insert({
      organization_id,
      metric_name: 'backup_configuration_created',
      metric_value: 1,
      metric_category: 'availability',
      context_data: {
        config_id: newConfig.id,
        config_name: newConfig.name,
        backup_type: newConfig.backup_type,
        source_type: newConfig.source_type,
        created_by: user.id,
      },
      data_source: 'backup_api',
    });

    return NextResponse.json(
      {
        success: true,
        data: newConfig,
        message: 'Backup configuration created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/backup/configurations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          'An unexpected error occurred while creating the backup configuration',
      },
      { status: 500 },
    );
  }
}

// =====================================================================================
// GET - LIST BACKUP CONFIGURATIONS
// =====================================================================================

export async function GET(request: NextRequest): Promise<
  NextResponse<
    ApiResponse<{
      configurations: BackupConfiguration[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      summary: {
        total_configurations: number;
        active_configurations: number;
        wedding_critical_configurations: number;
        next_backup_due: string | null;
      };
    }>
  >
> {
  try {
    const supabase = await createClient();

    // Validate user authentication and authorization
    const userAccess = await validateUserAccess(supabase);
    if (!userAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid authentication or organization access',
        },
        { status: 401 },
      );
    }

    const { organization_id } = userAccess;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = BackupConfigurationQuerySchema.safeParse(
      Object.fromEntries(searchParams),
    );

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          message: queryValidation.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join(', '),
        },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      backup_type,
      source_type,
      is_wedding_critical,
      is_active,
      search,
    } = queryValidation.data;

    // Build base query
    let query = supabase
      .from('backup_configurations')
      .select('*', { count: 'exact' })
      .eq('organization_id', organization_id);

    // Apply filters
    if (backup_type) {
      query = query.eq('backup_type', backup_type);
    }

    if (source_type) {
      query = query.eq('source_type', source_type);
    }

    if (is_wedding_critical !== undefined) {
      query = query.eq('is_wedding_critical', is_wedding_critical);
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,source_identifier.ilike.%${search}%`,
      );
    }

    // Apply pagination and ordering
    const offset = (page - 1) * limit;
    query = query
      .order('is_wedding_critical', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: configurations, error: queryError, count } = await query;

    if (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch backup configurations',
          message: queryError.message,
        },
        { status: 500 },
      );
    }

    // Get summary statistics
    const { data: summaryData } = await supabase
      .from('backup_configurations')
      .select('is_active, is_wedding_critical, next_backup_at')
      .eq('organization_id', organization_id);

    const summary = {
      total_configurations: summaryData?.length || 0,
      active_configurations:
        summaryData?.filter((c) => c.is_active).length || 0,
      wedding_critical_configurations:
        summaryData?.filter((c) => c.is_wedding_critical).length || 0,
      next_backup_due:
        summaryData
          ?.filter((c) => c.is_active && c.next_backup_at)
          ?.sort(
            (a, b) =>
              new Date(a.next_backup_at).getTime() -
              new Date(b.next_backup_at).getTime(),
          )[0]?.next_backup_at || null,
    };

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          configurations: configurations || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
          },
          summary,
        },
        message: `Retrieved ${configurations?.length || 0} backup configurations`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/backup/configurations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message:
          'An unexpected error occurred while fetching backup configurations',
      },
      { status: 500 },
    );
  }
}
