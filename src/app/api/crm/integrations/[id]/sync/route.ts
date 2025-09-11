// POST /api/crm/integrations/[id]/sync - Trigger Sync
// GET /api/crm/integrations/[id]/sync - List Sync Jobs
// Generated for WS-343 - CRM Integration Hub Backend

import { withSecureValidation } from '@/lib/validation/middleware';
import { CRMSyncJobProcessor } from '@/services/CRMSyncJobProcessor';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Validation schemas
const TriggerSyncSchema = z.object({
  job_type: z.enum(['full_import', 'incremental_sync', 'export_to_crm']),
  job_config: z.record(z.any()).optional(),
});

const GetSyncJobsSchema = z.object({});

export const POST = withSecureValidation(
  TriggerSyncSchema,
  async (request, { user, validatedData, params }) => {
    const integrationId = params?.id;
    const syncProcessor = new CRMSyncJobProcessor();

    if (!integrationId) {
      return Response.json(
        {
          error: 'MISSING_INTEGRATION_ID',
          message: 'Integration ID is required',
        },
        { status: 400 },
      );
    }

    try {
      // Verify integration ownership and status
      const { data: integration, error: integrationError } = await supabase
        .from('crm_integrations')
        .select(
          `
        *,
        suppliers!inner (
          auth_user_id,
          subscription_tier
        )
      `,
        )
        .eq('id', integrationId)
        .eq('suppliers.auth_user_id', user.id)
        .single();

      if (integrationError || !integration) {
        return Response.json(
          {
            error: 'INTEGRATION_NOT_FOUND',
            message: 'Integration not found or access denied',
          },
          { status: 404 },
        );
      }

      // Check if integration is connected
      if (integration.connection_status !== 'connected') {
        return Response.json(
          {
            error: 'INTEGRATION_NOT_CONNECTED',
            message: 'Integration not connected',
            details: 'Please complete the authentication setup first',
            current_status: integration.connection_status,
          },
          { status: 400 },
        );
      }

      // Check subscription tier limits for sync operations
      const tierLimits = {
        free: { syncs_per_day: 0, full_imports_per_month: 0 },
        starter: { syncs_per_day: 5, full_imports_per_month: 1 },
        professional: { syncs_per_day: 20, full_imports_per_month: 5 },
        scale: { syncs_per_day: 100, full_imports_per_month: 20 },
        enterprise: { syncs_per_day: 999, full_imports_per_month: 999 },
      };

      const currentTier = integration.suppliers.subscription_tier || 'free';
      const limits =
        tierLimits[currentTier as keyof typeof tierLimits] || tierLimits.free;

      // Check daily sync limit
      const today = new Date().toISOString().split('T')[0];
      const { count: dailySyncs } = await supabase
        .from('crm_sync_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('integration_id', integrationId)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      if ((dailySyncs || 0) >= limits.syncs_per_day) {
        return Response.json(
          {
            error: 'SYNC_LIMIT_REACHED',
            message: 'Daily sync limit reached',
            details: `Your ${currentTier} plan allows ${limits.syncs_per_day} syncs per day. Upgrade for more.`,
            current_count: dailySyncs,
            limit: limits.syncs_per_day,
            upgrade_url: '/pricing',
          },
          { status: 429 },
        );
      }

      // Check full import monthly limit for full_import jobs
      if (validatedData.job_type === 'full_import') {
        const thisMonth = new Date();
        const firstDayOfMonth = new Date(
          thisMonth.getFullYear(),
          thisMonth.getMonth(),
          1,
        ).toISOString();
        const lastDayOfMonth = new Date(
          thisMonth.getFullYear(),
          thisMonth.getMonth() + 1,
          0,
        ).toISOString();

        const { count: monthlyFullImports } = await supabase
          .from('crm_sync_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('integration_id', integrationId)
          .eq('job_type', 'full_import')
          .gte('created_at', firstDayOfMonth)
          .lte('created_at', lastDayOfMonth);

        if ((monthlyFullImports || 0) >= limits.full_imports_per_month) {
          return Response.json(
            {
              error: 'FULL_IMPORT_LIMIT_REACHED',
              message: 'Monthly full import limit reached',
              details: `Your ${currentTier} plan allows ${limits.full_imports_per_month} full imports per month.`,
              current_count: monthlyFullImports,
              limit: limits.full_imports_per_month,
              upgrade_url: '/pricing',
            },
            { status: 429 },
          );
        }
      }

      // Check for existing running jobs
      const { data: runningJobs } = await supabase
        .from('crm_sync_jobs')
        .select('id, job_type, created_at')
        .eq('integration_id', integrationId)
        .in('job_status', ['pending', 'running']);

      if (runningJobs && runningJobs.length > 0) {
        const runningJob = runningJobs[0];
        return Response.json(
          {
            error: 'SYNC_ALREADY_IN_PROGRESS',
            message: 'Sync already in progress',
            details: 'Please wait for the current sync to complete',
            running_job: {
              id: runningJob.id,
              type: runningJob.job_type,
              started_at: runningJob.created_at,
            },
          },
          { status: 409 },
        );
      }

      // Validate job config based on job type
      const jobConfig = validatedData.job_config || {};
      const validationError = validateJobConfig(
        validatedData.job_type,
        jobConfig,
      );
      if (validationError) {
        return Response.json(
          {
            error: 'INVALID_JOB_CONFIG',
            message: validationError,
          },
          { status: 400 },
        );
      }

      // Create sync job
      const { data: syncJob, error: jobError } = await supabase
        .from('crm_sync_jobs')
        .insert({
          integration_id: integrationId,
          job_type: validatedData.job_type,
          job_config: jobConfig,
        })
        .select()
        .single();

      if (jobError) {
        console.error('Failed to create sync job:', jobError);
        return Response.json(
          {
            error: 'SYNC_JOB_CREATION_FAILED',
            message: 'Failed to create sync job',
            details: jobError.message,
          },
          { status: 500 },
        );
      }

      // Queue job for background processing
      await syncProcessor.queueSyncJob(syncJob);

      // Log audit trail
      await syncProcessor.logAuditEvent(user.id, 'sync_triggered', {
        integration_id: integrationId,
        job_id: syncJob.id,
        job_type: validatedData.job_type,
        crm_provider: integration.crm_provider,
      });

      return Response.json(
        {
          success: true,
          sync_job: syncJob,
          message: 'Sync job created and queued for processing',
          estimated_duration: getEstimatedDuration(validatedData.job_type),
        },
        { status: 201 },
      );
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      return Response.json(
        {
          error: 'SYNC_TRIGGER_FAILED',
          message: 'Failed to trigger sync',
          details:
            process.env.NODE_ENV === 'development'
              ? (error as Error).message
              : 'An internal error occurred',
        },
        { status: 500 },
      );
    }
  },
);

export const GET = withSecureValidation(
  GetSyncJobsSchema,
  async (request, { user, params }) => {
    const integrationId = params?.id;
    const syncProcessor = new CRMSyncJobProcessor();

    if (!integrationId) {
      return Response.json(
        {
          error: 'MISSING_INTEGRATION_ID',
          message: 'Integration ID is required',
        },
        { status: 400 },
      );
    }

    try {
      // Verify integration ownership
      const { data: integration, error: integrationError } = await supabase
        .from('crm_integrations')
        .select(
          `
        id,
        suppliers!inner (
          auth_user_id
        )
      `,
        )
        .eq('id', integrationId)
        .eq('suppliers.auth_user_id', user.id)
        .single();

      if (integrationError || !integration) {
        return Response.json(
          {
            error: 'INTEGRATION_NOT_FOUND',
            message: 'Integration not found or access denied',
          },
          { status: 404 },
        );
      }

      // Get query parameters
      const url = new URL(request.url);
      const limit = Math.min(
        parseInt(url.searchParams.get('limit') || '20'),
        100,
      );
      const status = url.searchParams.get('status');

      // List sync jobs for this integration
      let query = supabase
        .from('crm_sync_jobs')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (
        status &&
        ['pending', 'running', 'completed', 'failed', 'cancelled'].includes(
          status,
        )
      ) {
        query = query.eq('job_status', status);
      }

      const { data: syncJobs, error: jobsError } = await query;

      if (jobsError) {
        throw new Error(`Failed to list sync jobs: ${jobsError.message}`);
      }

      // Get summary statistics
      const { data: stats } = await supabase
        .from('crm_sync_jobs')
        .select('job_status')
        .eq('integration_id', integrationId);

      const summary = {
        total: stats?.length || 0,
        pending: stats?.filter((j) => j.job_status === 'pending').length || 0,
        running: stats?.filter((j) => j.job_status === 'running').length || 0,
        completed:
          stats?.filter((j) => j.job_status === 'completed').length || 0,
        failed: stats?.filter((j) => j.job_status === 'failed').length || 0,
        cancelled:
          stats?.filter((j) => j.job_status === 'cancelled').length || 0,
      };

      return Response.json({
        success: true,
        sync_jobs: syncJobs || [],
        summary,
        limit,
        has_more: (syncJobs?.length || 0) === limit,
      });
    } catch (error) {
      console.error('Failed to list sync jobs:', error);
      return Response.json(
        {
          error: 'SYNC_JOBS_LIST_FAILED',
          message: 'Failed to retrieve sync jobs',
          details: 'An internal error occurred',
        },
        { status: 500 },
      );
    }
  },
);

// Helper functions

function validateJobConfig(
  jobType: string,
  jobConfig: Record<string, any>,
): string | null {
  switch (jobType) {
    case 'full_import':
      // Validate full import specific config
      if (
        jobConfig.include_archived !== undefined &&
        typeof jobConfig.include_archived !== 'boolean'
      ) {
        return 'include_archived must be a boolean';
      }
      if (
        jobConfig.date_range_start &&
        !isValidDate(jobConfig.date_range_start)
      ) {
        return 'date_range_start must be a valid ISO date';
      }
      if (jobConfig.date_range_end && !isValidDate(jobConfig.date_range_end)) {
        return 'date_range_end must be a valid ISO date';
      }
      break;

    case 'incremental_sync':
      // Validate incremental sync specific config
      if (jobConfig.sync_since && !isValidDate(jobConfig.sync_since)) {
        return 'sync_since must be a valid ISO date';
      }
      break;

    case 'export_to_crm':
      // Validate export specific config
      if (!jobConfig.export_filters) {
        return 'export_filters are required for export jobs';
      }
      break;

    default:
      return `Unsupported job type: ${jobType}`;
  }

  return null;
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}

function getEstimatedDuration(jobType: string): string {
  switch (jobType) {
    case 'full_import':
      return '5-15 minutes';
    case 'incremental_sync':
      return '30 seconds - 2 minutes';
    case 'export_to_crm':
      return '2-10 minutes';
    default:
      return '1-5 minutes';
  }
}
