import { NextRequest, NextResponse } from 'next/server';
import {
  getWeddingDashboardMetrics,
  getVendorPerformanceAnalytics,
  getBudgetVarianceAlerts,
  getTimelineMilestones,
  getBudgetCategories,
  updateWeddingCompletionMetrics,
  exportWeddingAnalytics,
} from '@/lib/analytics/wedding-metrics';
import { createClient } from '@/lib/supabase/server';

// =============================================
// GET: Wedding Dashboard Metrics
// =============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const includeCompleted = searchParams.get('include_completed') === 'true';

    // Verify user has access to this wedding
    const supabase = await createClient();
    const { data: wedding, error: weddingError } = await supabase
      .from('wedding_events')
      .select('id, user_id, wedding_name')
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json(
        { error: 'Wedding not found or access denied' },
        { status: 404 },
      );
    }

    // Handle different analytics types
    switch (type) {
      case 'dashboard':
        const dashboardMetrics = await getWeddingDashboardMetrics(weddingId);
        return NextResponse.json({
          success: true,
          data: dashboardMetrics,
          cached: false,
          timestamp: new Date().toISOString(),
        });

      case 'vendors':
        const vendorAnalytics = await getVendorPerformanceAnalytics(weddingId);
        return NextResponse.json({
          success: true,
          data: vendorAnalytics,
          cached: false,
          timestamp: new Date().toISOString(),
        });

      case 'budget':
        const [budgetCategories, budgetAlerts] = await Promise.all([
          getBudgetCategories(weddingId),
          getBudgetVarianceAlerts(weddingId),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            categories: budgetCategories,
            alerts: budgetAlerts,
          },
          cached: false,
          timestamp: new Date().toISOString(),
        });

      case 'timeline':
        const milestones = await getTimelineMilestones(weddingId, {
          includeCompleted,
          sortBy: (searchParams.get('sort') as any) || 'target_date',
          limit: searchParams.get('limit')
            ? parseInt(searchParams.get('limit')!)
            : undefined,
        });

        return NextResponse.json({
          success: true,
          data: milestones,
          cached: false,
          timestamp: new Date().toISOString(),
        });

      case 'comprehensive':
        // Get all analytics data in one request (optimized for dashboard)
        const [dashboard, vendors, budget, alerts, timeline] =
          await Promise.all([
            getWeddingDashboardMetrics(weddingId),
            getVendorPerformanceAnalytics(weddingId),
            getBudgetCategories(weddingId),
            getBudgetVarianceAlerts(weddingId),
            getTimelineMilestones(weddingId, {
              includeCompleted: false,
              limit: 10,
            }),
          ]);

        return NextResponse.json({
          success: true,
          data: {
            dashboard,
            vendors,
            budget: {
              categories: budget,
              alerts: alerts,
            },
            timeline,
          },
          cached: false,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error fetching wedding analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wedding analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// =============================================
// POST: Update Wedding Metrics
// =============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const body = await request.json();
    const { action, data } = body;

    // Verify user has access to this wedding
    const supabase = await createClient();
    const { data: wedding, error: weddingError } = await supabase
      .from('wedding_events')
      .select('id, user_id')
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      return NextResponse.json(
        { error: 'Wedding not found or access denied' },
        { status: 404 },
      );
    }

    switch (action) {
      case 'refresh_metrics':
        // Force recalculation of wedding completion metrics
        await updateWeddingCompletionMetrics(weddingId);

        return NextResponse.json({
          success: true,
          message: 'Wedding metrics updated successfully',
          timestamp: new Date().toISOString(),
        });

      case 'update_milestone':
        // Update a specific milestone
        if (!data.milestone_id) {
          return NextResponse.json(
            { error: 'Milestone ID is required' },
            { status: 400 },
          );
        }

        const { error: milestoneError } = await supabase
          .from('timeline_milestones')
          .update({
            completion_percentage: data.completion_percentage,
            is_completed: data.is_completed,
            actual_completion_date: data.is_completed
              ? new Date().toISOString()
              : null,
            milestone_status: data.is_completed
              ? 'completed'
              : data.status || 'in_progress',
            notes: data.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.milestone_id)
          .eq('wedding_id', weddingId);

        if (milestoneError) {
          return NextResponse.json(
            { error: 'Failed to update milestone' },
            { status: 500 },
          );
        }

        // Trigger metrics recalculation
        await updateWeddingCompletionMetrics(weddingId);

        return NextResponse.json({
          success: true,
          message: 'Milestone updated successfully',
          timestamp: new Date().toISOString(),
        });

      case 'update_vendor':
        // Update vendor performance data
        if (!data.vendor_id) {
          return NextResponse.json(
            { error: 'Vendor ID is required' },
            { status: 400 },
          );
        }

        const vendorUpdates: any = {};
        if (data.reliability_score !== undefined)
          vendorUpdates.reliability_score = data.reliability_score;
        if (data.communication_rating !== undefined)
          vendorUpdates.communication_rating = data.communication_rating;
        if (data.quality_rating !== undefined)
          vendorUpdates.quality_rating = data.quality_rating;
        if (data.actual_amount !== undefined)
          vendorUpdates.actual_amount = data.actual_amount;
        if (data.vendor_status !== undefined)
          vendorUpdates.vendor_status = data.vendor_status;
        if (data.actual_delivery_date !== undefined)
          vendorUpdates.actual_delivery_date = data.actual_delivery_date;

        vendorUpdates.updated_at = new Date().toISOString();

        const { error: vendorError } = await supabase
          .from('vendor_performance')
          .update(vendorUpdates)
          .eq('id', data.vendor_id)
          .eq('wedding_id', weddingId);

        if (vendorError) {
          return NextResponse.json(
            { error: 'Failed to update vendor performance' },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Vendor performance updated successfully',
          timestamp: new Date().toISOString(),
        });

      case 'update_budget':
        // Update budget category spending
        if (!data.budget_category_id) {
          return NextResponse.json(
            { error: 'Budget category ID is required' },
            { status: 400 },
          );
        }

        const budgetUpdates: any = {};
        if (data.spent_amount !== undefined)
          budgetUpdates.spent_amount = data.spent_amount;
        if (data.allocated_amount !== undefined)
          budgetUpdates.allocated_amount = data.allocated_amount;
        if (data.pending_amount !== undefined)
          budgetUpdates.pending_amount = data.pending_amount;
        if (data.projected_final_amount !== undefined)
          budgetUpdates.projected_final_amount = data.projected_final_amount;
        if (data.notes !== undefined) budgetUpdates.notes = data.notes;

        budgetUpdates.updated_at = new Date().toISOString();

        const { error: budgetError } = await supabase
          .from('budget_categories')
          .update(budgetUpdates)
          .eq('id', data.budget_category_id)
          .eq('wedding_id', weddingId);

        if (budgetError) {
          return NextResponse.json(
            { error: 'Failed to update budget category' },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Budget category updated successfully',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating wedding analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to update wedding analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
