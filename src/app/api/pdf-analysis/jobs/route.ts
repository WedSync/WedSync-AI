/**
 * PDF Analysis Jobs API Endpoint
 * WS-242: AI PDF Analysis System - Job Management
 *
 * Handles listing, filtering, and managing PDF analysis jobs
 * Optimized for wedding businesses with high-volume processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createPDFAnalysisRepository } from '@/lib/repositories/pdfAnalysisRepository';

// Query parameters validation schema
const jobsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  extractionType: z.string().optional(),
  priority: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'file_name', 'priority', 'status'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeFields: z.enum(['true', 'false']).default('false'),
  includeCosts: z.enum(['true', 'false']).default('false'),
  includeProgress: z.enum(['true', 'false']).default('false'),
});

/**
 * GET /api/pdf-analysis/jobs
 * List PDF analysis jobs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Get user's organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, organization:organizations(id, name)')
      .eq('user_id', user.id);

    if (orgError || !organizations?.length) {
      return NextResponse.json(
        { error: 'No organization access', code: 'NO_ACCESS' },
        { status: 403 },
      );
    }

    // Parse and validate query parameters
    const searchParams = new URL(request.url).searchParams;
    const queryResult = jobsQuerySchema.safeParse(
      Object.fromEntries(searchParams),
    );

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'INVALID_PARAMS',
          details: queryResult.error.issues,
        },
        { status: 400 },
      );
    }

    const query = queryResult.data;

    // Build filters
    const organizationIds = organizations.map((org) => org.organization_id);
    const filters = {
      organizationIds,
      ...(query.status && { status: query.status.split(',') }),
      ...(query.extractionType && {
        extractionType: query.extractionType.split(','),
      }),
      ...(query.priority && { priority: query.priority.split(',') }),
      ...(query.dateFrom && { dateFrom: query.dateFrom }),
      ...(query.dateTo && { dateTo: query.dateTo }),
      ...(query.search && { search: query.search }),
    };

    // Get jobs from repository
    const repository = createPDFAnalysisRepository();

    // Use optimized query based on includes
    let jobs;

    if (
      query.includeFields === 'true' ||
      query.includeCosts === 'true' ||
      query.includeProgress === 'true'
    ) {
      // Get jobs with related data
      jobs = await repository.getJobsWithDetails(
        filters,
        query.page,
        query.limit,
        {
          includeFields: query.includeFields === 'true',
          includeCosts: query.includeCosts === 'true',
          includeProgress: query.includeProgress === 'true',
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        },
      );
    } else {
      // Get basic job list
      jobs = await repository.getJobs(filters, query.page, query.limit);
    }

    // Calculate summary statistics
    const summary = await repository.getJobsSummary(organizationIds, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    // Prepare response
    const response = {
      success: true,
      data: {
        jobs: jobs.jobs,
        pagination: {
          page: jobs.page,
          limit: query.limit,
          total: jobs.total,
          totalPages: jobs.totalPages,
          hasNext: jobs.page < jobs.totalPages,
          hasPrevious: jobs.page > 1,
        },
        summary: {
          totalJobs: summary.totalJobs,
          pendingJobs: summary.pendingJobs,
          processingJobs: summary.processingJobs,
          completedJobs: summary.completedJobs,
          failedJobs: summary.failedJobs,
          successRate: summary.successRate,
          averageProcessingTime: summary.averageProcessingTime,
          totalCost: summary.totalCost,
        },
        meta: {
          includeFields: query.includeFields === 'true',
          includeCosts: query.includeCosts === 'true',
          includeProgress: query.includeProgress === 'true',
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        },
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=0',
        'X-Total-Count': jobs.total.toString(),
      },
    });
  } catch (error) {
    console.error('Jobs listing API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch jobs',
        code: 'FETCH_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/pdf-analysis/jobs
 * Create multiple jobs or batch operations
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, jobIds, organizationId, data: actionData } = body;

    // Verify organization access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    const repository = createPDFAnalysisRepository();

    switch (action) {
      case 'bulk_delete':
        if (!Array.isArray(jobIds) || jobIds.length === 0) {
          return NextResponse.json(
            {
              error: 'Job IDs required for bulk delete',
              code: 'INVALID_REQUEST',
            },
            { status: 400 },
          );
        }

        const deletedCount = await repository.bulkDeleteJobs(
          jobIds,
          organizationId,
        );
        return NextResponse.json({
          success: true,
          message: `${deletedCount} jobs deleted`,
          deletedCount,
        });

      case 'bulk_retry':
        if (!Array.isArray(jobIds) || jobIds.length === 0) {
          return NextResponse.json(
            {
              error: 'Job IDs required for bulk retry',
              code: 'INVALID_REQUEST',
            },
            { status: 400 },
          );
        }

        const retriedJobs = await repository.bulkRetryJobs(
          jobIds,
          organizationId,
        );
        return NextResponse.json({
          success: true,
          message: `${retriedJobs.length} jobs queued for retry`,
          retriedJobs,
        });

      case 'bulk_priority_update':
        if (
          !Array.isArray(jobIds) ||
          jobIds.length === 0 ||
          !actionData?.priority
        ) {
          return NextResponse.json(
            { error: 'Job IDs and priority required', code: 'INVALID_REQUEST' },
            { status: 400 },
          );
        }

        const updatedJobs = await repository.bulkUpdateJobsPriority(
          jobIds,
          organizationId,
          actionData.priority,
        );

        return NextResponse.json({
          success: true,
          message: `${updatedJobs.length} jobs priority updated`,
          updatedJobs,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action', code: 'INVALID_ACTION' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Jobs batch operation error:', error);
    return NextResponse.json(
      {
        error: 'Batch operation failed',
        code: 'BATCH_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/pdf-analysis/jobs
 * Update multiple jobs status or metadata
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { jobIds, organizationId, updates } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json(
        { error: 'Job IDs required', code: 'INVALID_REQUEST' },
        { status: 400 },
      );
    }

    // Verify organization access
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json(
        { error: 'Organization access denied', code: 'ACCESS_DENIED' },
        { status: 403 },
      );
    }

    const repository = createPDFAnalysisRepository();
    const updatedJobs = await repository.bulkUpdateJobs(
      jobIds,
      organizationId,
      updates,
    );

    return NextResponse.json({
      success: true,
      message: `${updatedJobs.length} jobs updated`,
      updatedJobs,
    });
  } catch (error) {
    console.error('Jobs bulk update error:', error);
    return NextResponse.json(
      {
        error: 'Bulk update failed',
        code: 'UPDATE_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
      },
      { status: 500 },
    );
  }
}
