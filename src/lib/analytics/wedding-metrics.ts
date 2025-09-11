import { createClient } from '@/lib/supabase/server';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface WeddingEvent {
  id: string;
  user_id: string;
  wedding_name: string;
  bride_name?: string;
  groom_name?: string;
  wedding_date: string;
  venue_name?: string;
  venue_location?: string;
  expected_guests: number;
  confirmed_guests: number;
  guest_capacity_utilization: number;
  total_budget: number;
  spent_amount: number;
  budget_utilization: number;
  planning_status:
    | 'planning'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'postponed';
  days_until_wedding: number;
  completion_percentage: number;
  vendor_count: number;
  milestone_completion_rate: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface VendorPerformance {
  id: string;
  wedding_id: string;
  vendor_name: string;
  vendor_category: VendorCategory;
  response_time_hours: number;
  reliability_score: number;
  communication_rating: number;
  quality_rating: number;
  quoted_amount: number;
  actual_amount: number;
  cost_variance: number;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  delivery_delay_days?: number;
  vendor_status:
    | 'inquiry'
    | 'quoted'
    | 'contracted'
    | 'in_progress'
    | 'delivered'
    | 'cancelled';
  payment_status: 'pending' | 'partial' | 'completed' | 'overdue' | 'refunded';
  performance_history: any[];
  created_at: string;
  updated_at: string;
}

export interface TimelineMilestone {
  id: string;
  wedding_id: string;
  milestone_name: string;
  milestone_category: MilestoneCategory;
  milestone_description?: string;
  target_completion_date: string;
  actual_completion_date?: string;
  is_completed: boolean;
  completion_percentage: number;
  depends_on_milestone_ids: string[];
  blocks_milestone_ids: string[];
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  impact_score: number;
  days_ahead_behind: number;
  estimated_cost: number;
  actual_cost: number;
  assigned_to?: string;
  milestone_status:
    | 'not_started'
    | 'in_progress'
    | 'on_hold'
    | 'completed'
    | 'cancelled'
    | 'overdue';
  notes?: string;
  progress_history: any[];
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  wedding_id: string;
  category_name: string;
  category_type: BudgetCategoryType;
  parent_category_id?: string;
  allocated_amount: number;
  spent_amount: number;
  pending_amount: number;
  variance_amount: number;
  variance_percentage: number;
  is_over_budget: boolean;
  budget_utilization: number;
  projected_final_amount: number;
  confidence_level: number;
  spending_history: any[];
  allocation_changes: any[];
  last_payment_sync_at?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type VendorCategory =
  | 'catering'
  | 'photography'
  | 'videography'
  | 'florals'
  | 'venue'
  | 'music'
  | 'transportation'
  | 'attire'
  | 'beauty'
  | 'decorations'
  | 'entertainment'
  | 'planning'
  | 'other';

export type MilestoneCategory =
  | 'planning'
  | 'vendor_selection'
  | 'booking'
  | 'design'
  | 'logistics'
  | 'legal'
  | 'communication'
  | 'rehearsal'
  | 'day_of'
  | 'post_wedding';

export type BudgetCategoryType =
  | 'venue'
  | 'catering'
  | 'photography'
  | 'videography'
  | 'florals'
  | 'music'
  | 'transportation'
  | 'attire'
  | 'beauty'
  | 'rings'
  | 'decorations'
  | 'entertainment'
  | 'stationery'
  | 'gifts'
  | 'honeymoon'
  | 'miscellaneous';

export interface WeddingDashboardMetrics {
  wedding_info: {
    id: string;
    name: string;
    date: string;
    days_until: number;
    status: string;
    completion_percentage: number;
  };
  budget_summary: {
    total_budget: number;
    total_spent: number;
    remaining_budget: number;
    utilization_percentage: number;
    over_budget_categories: number;
  };
  vendor_summary: Array<{
    category: VendorCategory;
    count: number;
    avg_rating: number;
    on_time_percentage: number;
  }>;
  milestone_progress: {
    total_milestones: number;
    completed: number;
    overdue: number;
    completion_rate: number;
  };
}

export interface VendorPerformanceAnalytics {
  wedding_id: string;
  vendor_category: VendorCategory;
  vendor_count: number;
  avg_reliability_score: number;
  avg_communication_rating: number;
  avg_quality_rating: number;
  avg_response_time_hours: number;
  total_quoted: number;
  total_actual: number;
  avg_cost_variance: number;
  delayed_deliveries: number;
  on_time_deliveries: number;
  avg_delay_days: number;
  completed_vendors: number;
  active_vendors: number;
}

export interface BudgetVarianceAlert {
  category_name: string;
  variance_amount: number;
  variance_percentage: number;
  alert_level: 'CRITICAL' | 'WARNING' | 'UNDER_BUDGET' | 'NORMAL';
}

// =============================================
// CORE ANALYTICS FUNCTIONS
// =============================================

/**
 * Get comprehensive real-time dashboard metrics for a wedding
 */
export async function getWeddingDashboardMetrics(
  weddingId: string,
): Promise<WeddingDashboardMetrics> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc(
      'get_wedding_dashboard_metrics',
      { wedding_uuid: weddingId },
    );

    if (error) {
      console.error('Error fetching wedding dashboard metrics:', error);
      throw new Error(`Failed to fetch dashboard metrics: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getWeddingDashboardMetrics:', error);
    throw new Error('Failed to fetch wedding dashboard metrics');
  }
}

/**
 * Get all weddings for a user with summary metrics
 */
export async function getUserWeddings(
  userId?: string,
): Promise<WeddingEvent[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('wedding_events')
      .select('*')
      .order('wedding_date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user weddings:', error);
      throw new Error(`Failed to fetch weddings: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserWeddings:', error);
    throw new Error('Failed to fetch user weddings');
  }
}

/**
 * Get vendor performance analytics for a wedding
 */
export async function getVendorPerformanceAnalytics(
  weddingId: string,
): Promise<VendorPerformanceAnalytics[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('vendor_performance_analytics')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error) {
      console.error('Error fetching vendor performance analytics:', error);
      throw new Error(`Failed to fetch vendor analytics: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getVendorPerformanceAnalytics:', error);
    throw new Error('Failed to fetch vendor performance analytics');
  }
}

/**
 * Get budget variance alerts for a wedding
 */
export async function getBudgetVarianceAlerts(
  weddingId: string,
): Promise<BudgetVarianceAlert[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('get_budget_variance_alerts', {
      wedding_uuid: weddingId,
    });

    if (error) {
      console.error('Error fetching budget variance alerts:', error);
      throw new Error(`Failed to fetch budget alerts: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBudgetVarianceAlerts:', error);
    throw new Error('Failed to fetch budget variance alerts');
  }
}

/**
 * Get timeline milestones with efficiency tracking
 */
export async function getTimelineMilestones(
  weddingId: string,
  options: {
    includeCompleted?: boolean;
    sortBy?: 'target_date' | 'priority' | 'status';
    limit?: number;
  } = {},
): Promise<TimelineMilestone[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('timeline_milestones')
      .select('*')
      .eq('wedding_id', weddingId);

    if (!options.includeCompleted) {
      query = query.neq('milestone_status', 'completed');
    }

    // Apply sorting
    switch (options.sortBy) {
      case 'priority':
        query = query.order('priority_level', { ascending: false });
        break;
      case 'status':
        query = query.order('milestone_status', { ascending: true });
        break;
      default:
        query = query.order('target_completion_date', { ascending: true });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching timeline milestones:', error);
      throw new Error(`Failed to fetch milestones: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTimelineMilestones:', error);
    throw new Error('Failed to fetch timeline milestones');
  }
}

/**
 * Get budget categories with variance analysis
 */
export async function getBudgetCategories(
  weddingId: string,
): Promise<BudgetCategory[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('budget_utilization', { ascending: false });

    if (error) {
      console.error('Error fetching budget categories:', error);
      throw new Error(`Failed to fetch budget categories: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBudgetCategories:', error);
    throw new Error('Failed to fetch budget categories');
  }
}

/**
 * Get vendor performance records for a wedding
 */
export async function getVendorPerformance(
  weddingId: string,
  options: {
    category?: VendorCategory;
    status?: string;
    sortBy?: 'reliability' | 'rating' | 'cost_variance';
  } = {},
): Promise<VendorPerformance[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('vendor_performance')
      .select('*')
      .eq('wedding_id', weddingId);

    if (options.category) {
      query = query.eq('vendor_category', options.category);
    }

    if (options.status) {
      query = query.eq('vendor_status', options.status);
    }

    // Apply sorting
    switch (options.sortBy) {
      case 'reliability':
        query = query.order('reliability_score', { ascending: false });
        break;
      case 'rating':
        query = query.order('quality_rating', { ascending: false });
        break;
      case 'cost_variance':
        query = query.order('cost_variance', { ascending: true });
        break;
      default:
        query = query.order('vendor_name', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vendor performance:', error);
      throw new Error(`Failed to fetch vendor performance: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getVendorPerformance:', error);
    throw new Error('Failed to fetch vendor performance');
  }
}

// =============================================
// REAL-TIME UPDATE FUNCTIONS
// =============================================

/**
 * Update wedding completion metrics (triggers real-time recalculation)
 */
export async function updateWeddingCompletionMetrics(
  weddingId: string,
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('update_wedding_completion_metrics', {
      wedding_uuid: weddingId,
    });

    if (error) {
      console.error('Error updating wedding completion metrics:', error);
      throw new Error(`Failed to update metrics: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in updateWeddingCompletionMetrics:', error);
    throw new Error('Failed to update wedding completion metrics');
  }
}

/**
 * Sync budget spending with payment data
 */
export async function syncBudgetWithPayments(): Promise<any> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc(
      'sync_budget_with_mapped_payments',
    );

    if (error) {
      console.error('Error syncing budget with payments:', error);
      throw new Error(`Failed to sync budget: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in syncBudgetWithPayments:', error);
    throw new Error('Failed to sync budget with payments');
  }
}

// =============================================
// ANALYTICS AGGREGATION FUNCTIONS
// =============================================

/**
 * Get wedding analytics summary from materialized view (optimized for speed)
 */
export async function getWeddingAnalyticsSummary(
  userId?: string,
  limit: number = 10,
): Promise<any[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('wedding_analytics_summary')
      .select('*')
      .order('last_updated', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching wedding analytics summary:', error);
      throw new Error(`Failed to fetch analytics summary: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getWeddingAnalyticsSummary:', error);
    throw new Error('Failed to fetch wedding analytics summary');
  }
}

/**
 * Calculate wedding efficiency score based on multiple factors
 */
export function calculateWeddingEfficiencyScore(
  metrics: WeddingDashboardMetrics,
): number {
  const { milestone_progress, budget_summary, vendor_summary } = metrics;

  // Weighted scoring algorithm
  const timelineScore = milestone_progress.completion_rate * 0.4;
  const budgetScore =
    Math.max(0, 100 - budget_summary.utilization_percentage) * 0.3;
  const vendorScore =
    (vendor_summary.reduce((avg, vendor) => avg + vendor.avg_rating, 0) /
      vendor_summary.length) *
    20 *
    0.3; // Convert 5-point to 100-point scale

  const totalScore = timelineScore + budgetScore + vendorScore;

  return Math.round(Math.min(100, Math.max(0, totalScore)));
}

/**
 * Get wedding status based on various metrics
 */
export function getWeddingStatus(metrics: WeddingDashboardMetrics): {
  status: 'on_track' | 'at_risk' | 'behind_schedule' | 'over_budget';
  message: string;
  urgency: 'low' | 'medium' | 'high';
} {
  const { milestone_progress, budget_summary, wedding_info } = metrics;

  // Check budget status
  if (
    budget_summary.over_budget_categories > 0 ||
    budget_summary.utilization_percentage > 95
  ) {
    return {
      status: 'over_budget',
      message: 'Budget concerns require attention',
      urgency: 'high',
    };
  }

  // Check timeline status
  if (
    milestone_progress.overdue > 0 ||
    milestone_progress.completion_rate < 50
  ) {
    return {
      status: 'behind_schedule',
      message: 'Timeline milestones need attention',
      urgency: 'high',
    };
  }

  // Check overall progress vs time remaining
  const daysUntil = wedding_info.days_until;
  const expectedProgress = Math.max(
    0,
    Math.min(100, 100 - (daysUntil / 365) * 100),
  );

  if (wedding_info.completion_percentage < expectedProgress - 20) {
    return {
      status: 'at_risk',
      message: 'Planning progress is behind schedule',
      urgency: 'medium',
    };
  }

  return {
    status: 'on_track',
    message: 'Wedding planning is progressing well',
    urgency: 'low',
  };
}

// =============================================
// EXPORT FUNCTIONS
// =============================================

/**
 * Export wedding analytics data to CSV format
 */
export async function exportWeddingAnalytics(
  weddingId: string,
  format: 'csv' | 'json' = 'csv',
): Promise<string> {
  try {
    const [dashboardMetrics, vendorAnalytics, budgetCategories, milestones] =
      await Promise.all([
        getWeddingDashboardMetrics(weddingId),
        getVendorPerformanceAnalytics(weddingId),
        getBudgetCategories(weddingId),
        getTimelineMilestones(weddingId, { includeCompleted: true }),
      ]);

    if (format === 'json') {
      return JSON.stringify(
        {
          dashboard_metrics: dashboardMetrics,
          vendor_analytics: vendorAnalytics,
          budget_categories: budgetCategories,
          milestones: milestones,
          exported_at: new Date().toISOString(),
        },
        null,
        2,
      );
    }

    // CSV format
    const csvData = [
      // Header
      'Category,Metric,Value,Details',

      // Dashboard metrics
      `Wedding Info,Name,${dashboardMetrics.wedding_info.name},`,
      `Wedding Info,Date,${dashboardMetrics.wedding_info.date},`,
      `Wedding Info,Days Until,${dashboardMetrics.wedding_info.days_until},`,
      `Wedding Info,Completion %,${dashboardMetrics.wedding_info.completion_percentage},`,

      // Budget summary
      `Budget,Total Budget,${dashboardMetrics.budget_summary.total_budget},`,
      `Budget,Total Spent,${dashboardMetrics.budget_summary.total_spent},`,
      `Budget,Remaining,${dashboardMetrics.budget_summary.remaining_budget},`,
      `Budget,Utilization %,${dashboardMetrics.budget_summary.utilization_percentage},`,

      // Milestone summary
      `Timeline,Total Milestones,${dashboardMetrics.milestone_progress.total_milestones},`,
      `Timeline,Completed,${dashboardMetrics.milestone_progress.completed},`,
      `Timeline,Overdue,${dashboardMetrics.milestone_progress.overdue},`,
      `Timeline,Completion Rate %,${dashboardMetrics.milestone_progress.completion_rate},`,

      // Vendor summary
      ...dashboardMetrics.vendor_summary.map(
        (vendor) =>
          `Vendor,${vendor.category},${vendor.count},"Rating: ${vendor.avg_rating}, On-time: ${vendor.on_time_percentage}%"`,
      ),
    ];

    return csvData.join('\n');
  } catch (error) {
    console.error('Error exporting wedding analytics:', error);
    throw new Error('Failed to export wedding analytics');
  }
}
