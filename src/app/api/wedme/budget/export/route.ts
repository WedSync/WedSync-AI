/**
 * WS-166: Budget Export API Endpoint - POST /api/wedme/budget/export
 * Team B: Core export processing API with comprehensive security validation
 *
 * Features:
 * - Secure input validation with Zod schemas
 * - Authentication and authorization checks
 * - Rate limiting for export abuse prevention
 * - Async queue processing for large exports
 * - Supabase Storage integration
 * - Comprehensive error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '@/lib/validation/middleware';
import { exportRequestSchema } from '@/lib/validation/budget-export-schemas';
import { createClient } from '@/lib/supabase/server';
import type {
  ExportRequest,
  ExportResponse,
  BudgetData,
} from '@/types/budget-export';

// Rate limiting configuration
const RATE_LIMITS = {
  maxExportsPerHour: 5,
  maxConcurrentExports: 2,
  windowMs: 60 * 60 * 1000, // 1 hour
} as const;

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const activeExports = new Map<string, Set<string>>(); // userId -> Set<exportId>

/**
 * Rate limiting check for export requests
 */
async function checkRateLimit(
  userId: string,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const userKey = `export_${userId}`;
  const userData = rateLimitStore.get(userKey);

  // Reset if window expired
  if (!userData || now >= userData.resetTime) {
    rateLimitStore.set(userKey, {
      count: 1,
      resetTime: now + RATE_LIMITS.windowMs,
    });
    return {
      allowed: true,
      remaining: RATE_LIMITS.maxExportsPerHour - 1,
      resetTime: now + RATE_LIMITS.windowMs,
    };
  }

  // Check if limit exceeded
  if (userData.count >= RATE_LIMITS.maxExportsPerHour) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userData.resetTime,
    };
  }

  // Increment count
  userData.count++;
  rateLimitStore.set(userKey, userData);

  return {
    allowed: true,
    remaining: RATE_LIMITS.maxExportsPerHour - userData.count,
    resetTime: userData.resetTime,
  };
}

/**
 * Check concurrent export limit
 */
function checkConcurrentLimit(userId: string): boolean {
  const userExports = activeExports.get(userId);
  return !userExports || userExports.size < RATE_LIMITS.maxConcurrentExports;
}

/**
 * Get couple's budget data for export
 */
async function getBudgetData(
  supabase: any,
  coupleId: string,
  filters: ExportRequest['filters'],
): Promise<BudgetData> {
  // Base query for budget items
  let itemsQuery = supabase
    .from('budget_items')
    .select(
      `
      id,
      category_id,
      category_name,
      vendor_id,
      vendor_name,
      description,
      planned_amount,
      actual_amount,
      payment_status,
      payment_date,
      due_date,
      notes,
      created_at,
      updated_at
    `,
    )
    .eq('couple_id', coupleId);

  // Apply filters
  if (filters.categories && filters.categories.length > 0) {
    itemsQuery = itemsQuery.in('category_name', filters.categories);
  }

  if (filters.vendor_ids && filters.vendor_ids.length > 0) {
    itemsQuery = itemsQuery.in('vendor_id', filters.vendor_ids);
  }

  if (filters.payment_status && filters.payment_status !== 'all') {
    itemsQuery = itemsQuery.eq('payment_status', filters.payment_status);
  }

  if (filters.date_range) {
    itemsQuery = itemsQuery
      .gte('created_at', filters.date_range.start)
      .lte('created_at', filters.date_range.end);
  }

  if (filters.amount_range) {
    itemsQuery = itemsQuery
      .gte('planned_amount', filters.amount_range.min)
      .lte('planned_amount', filters.amount_range.max);
  }

  // Execute queries
  const [itemsResult, categoriesResult, paymentsResult] = await Promise.all([
    itemsQuery,
    supabase.from('budget_categories').select('*').eq('couple_id', coupleId),
    supabase.from('payment_schedule').select('*').eq('couple_id', coupleId),
  ]);

  if (itemsResult.error) {
    throw new Error(
      `Failed to fetch budget items: ${itemsResult.error.message}`,
    );
  }

  if (categoriesResult.error) {
    throw new Error(
      `Failed to fetch budget categories: ${categoriesResult.error.message}`,
    );
  }

  const items = itemsResult.data || [];
  const categories = categoriesResult.data || [];
  const payments = paymentsResult.data || [];

  // Calculate totals
  const totalBudget = categories.reduce(
    (sum, cat) => sum + (cat.allocated_amount || 0),
    0,
  );
  const totalSpent = items.reduce(
    (sum, item) => sum + (item.actual_amount || 0),
    0,
  );
  const totalRemaining = totalBudget - totalSpent;

  // Calculate summary statistics
  const summary = {
    total_vendors: new Set(items.map((item) => item.vendor_id).filter(Boolean))
      .size,
    total_categories: categories.length,
    average_spending_per_category:
      categories.length > 0 ? totalSpent / categories.length : 0,
    largest_expense: items.reduce(
      (max, item) =>
        (item.actual_amount || 0) > (max.actual_amount || 0) ? item : max,
      items[0] || ({} as any),
    ),
    upcoming_payments: payments.filter(
      (p) => new Date(p.due_date) > new Date() && p.status === 'pending',
    ),
    overdue_payments: payments.filter(
      (p) => new Date(p.due_date) < new Date() && p.status === 'pending',
    ),
    budget_utilization_percentage:
      totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
  };

  return {
    couple_id: coupleId,
    total_budget: totalBudget,
    total_spent: totalSpent,
    total_remaining: totalRemaining,
    categories,
    items,
    payment_schedule: payments,
    summary,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Create export record in database
 */
async function createExportRecord(
  supabase: any,
  coupleId: string,
  exportRequest: ExportRequest,
): Promise<string> {
  const exportRecord = {
    couple_id: coupleId,
    export_type: exportRequest.format,
    export_filters: exportRequest.filters,
    file_name: `budget-export-${Date.now()}.${exportRequest.format}`,
    status: 'generating',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('budget_exports')
    .insert(exportRecord)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create export record: ${error.message}`);
  }

  return data.id;
}

/**
 * Add export to processing queue
 */
async function addToQueue(
  supabase: any,
  exportId: string,
  priority: number = 1,
): Promise<void> {
  const queueItem = {
    export_id: exportId,
    priority,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('export_queue').insert(queueItem);

  if (error) {
    throw new Error(`Failed to add to queue: ${error.message}`);
  }
}

/**
 * Main POST handler for budget export requests
 */
export const POST = withSecureValidation(
  exportRequestSchema,
  async (
    request: NextRequest,
    validatedData: ExportRequest,
  ): Promise<NextResponse> => {
    try {
      // Initialize Supabase client
      const supabase = await createClient();

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Authentication required' },
          { status: 401 },
        );
      }

      // Get user's profile and couple information
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'User profile not found' },
          { status: 403 },
        );
      }

      // For this endpoint, we need to determine the couple_id
      // In a real implementation, this might come from the request or session
      // For now, let's get it from the couples table based on user's organization
      const { data: couples, error: couplesError } = await supabase
        .from('couples')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .limit(1);

      if (couplesError || !couples || couples.length === 0) {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'No couples found for this user' },
          { status: 404 },
        );
      }

      const coupleId = couples[0].id;

      // Check rate limiting
      const rateLimit = await checkRateLimit(user.id);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'RATE_LIMITED',
            message: `Export limit exceeded. You can make ${RATE_LIMITS.maxExportsPerHour} exports per hour.`,
            resetTime: rateLimit.resetTime,
            remaining: 0,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMITS.maxExportsPerHour.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(
                rateLimit.resetTime / 1000,
              ).toString(),
            },
          },
        );
      }

      // Check concurrent export limit
      if (!checkConcurrentLimit(user.id)) {
        return NextResponse.json(
          {
            error: 'CONCURRENT_LIMIT',
            message: `Too many concurrent exports. Maximum ${RATE_LIMITS.maxConcurrentExports} exports at a time.`,
          },
          { status: 429 },
        );
      }

      // Validate budget data access
      const budgetData = await getBudgetData(
        supabase,
        coupleId,
        validatedData.filters,
      );

      if (!budgetData.items || budgetData.items.length === 0) {
        return NextResponse.json(
          {
            error: 'NO_DATA',
            message: 'No budget data found matching the specified filters',
          },
          { status: 404 },
        );
      }

      // Create export record
      const exportId = await createExportRecord(
        supabase,
        coupleId,
        validatedData,
      );

      // Add to processing queue
      const priority =
        validatedData.format === 'csv'
          ? 1
          : validatedData.format === 'excel'
            ? 2
            : 3; // PDF gets highest priority
      await addToQueue(supabase, exportId, priority);

      // Track active export
      if (!activeExports.has(user.id)) {
        activeExports.set(user.id, new Set());
      }
      activeExports.get(user.id)!.add(exportId);

      // Estimate completion time based on data size and format
      const itemCount = budgetData.items.length;
      const baseTime =
        validatedData.format === 'csv'
          ? 5
          : validatedData.format === 'excel'
            ? 15
            : 30; // seconds
      const estimatedTime = baseTime + Math.floor(itemCount / 100) * 5;

      // Return success response
      const response: ExportResponse = {
        exportId,
        status: 'generating',
        estimatedCompletionTime: estimatedTime,
        message: `Export queued successfully. Processing ${itemCount} budget items.`,
      };

      return NextResponse.json(response, {
        status: 202, // Accepted
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.maxExportsPerHour.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
          Location: `/api/wedme/budget/export-status/${exportId}`,
        },
      });
    } catch (error) {
      console.error('Budget export error:', error);

      // Don't leak sensitive error details to client
      const isKnownError =
        error instanceof Error &&
        (error.message.includes('Failed to fetch') ||
          error.message.includes('Failed to create') ||
          error.message.includes('Failed to add'));

      return NextResponse.json(
        {
          error: 'EXPORT_FAILED',
          message: isKnownError
            ? error.message
            : 'Failed to process export request',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  },
);

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET method not supported on this endpoint',
    },
    { status: 405, headers: { Allow: 'POST' } },
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'PUT method not supported on this endpoint',
    },
    { status: 405, headers: { Allow: 'POST' } },
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'METHOD_NOT_ALLOWED',
      message: 'DELETE method not supported on this endpoint',
    },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
