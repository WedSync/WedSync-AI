import { NextRequest, NextResponse } from 'next/server';
import { fieldEngine } from '@/lib/field-engine/FieldEngine';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const queryAnalyticsSchema = z.object({
  fieldId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * GET /api/fields/analytics - Get field usage analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = {
      fieldId: searchParams.get('fieldId'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      limit: searchParams.get('limit'),
    };

    const validatedQuery = queryAnalyticsSchema.parse(query);

    // Get user context
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 },
      );
    }

    let analyticsData: any[] = [];

    if (validatedQuery.fieldId) {
      // Get analytics for specific field
      const analytics = fieldEngine.getFieldAnalytics(validatedQuery.fieldId);
      if (analytics) {
        analyticsData = [analytics];
      }
    } else {
      // Get popular templates based on usage
      const popularTemplates = fieldEngine.getPopularTemplates(
        validatedQuery.limit,
      );

      // Get field usage stats from database
      let query_builder = supabase
        .from('form_submissions')
        .select(
          `
          form_id,
          data,
          submitted_at,
          forms!inner(organization_id)
        `,
        )
        .eq('forms.organization_id', profile.organization_id);

      if (validatedQuery.dateFrom) {
        query_builder = query_builder.gte(
          'submitted_at',
          validatedQuery.dateFrom,
        );
      }

      if (validatedQuery.dateTo) {
        query_builder = query_builder.lte(
          'submitted_at',
          validatedQuery.dateTo,
        );
      }

      const { data: submissions } = await query_builder.limit(1000);

      // Process analytics from submissions
      const fieldUsageStats = new Map();

      submissions?.forEach((submission) => {
        Object.keys(submission.data || {}).forEach((fieldId) => {
          const stats = fieldUsageStats.get(fieldId) || {
            fieldId,
            usageCount: 0,
            lastUsed: new Date(0),
            completionRate: 0,
          };

          stats.usageCount++;

          const submissionDate = new Date(submission.submitted_at);
          if (submissionDate > stats.lastUsed) {
            stats.lastUsed = submissionDate;
          }

          fieldUsageStats.set(fieldId, stats);
        });
      });

      analyticsData = Array.from(fieldUsageStats.values())
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, validatedQuery.limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        analytics: analyticsData,
        summary: {
          totalFields: analyticsData.length,
          dateRange: {
            from: validatedQuery.dateFrom,
            to: validatedQuery.dateTo,
          },
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/fields/analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
