/**
 * Dashboard Service - WS-037 Main Dashboard Backend
 * Team B - Round 2 Implementation
 * Handles dashboard data aggregation, caching, and real-time updates
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { DashboardCache } from '@/lib/cache/dashboardCache';
import { z } from 'zod';

type SupabaseClient = ReturnType<typeof createClient>;

// Type definitions for dashboard data
export interface DashboardSummary {
  totalWeddings: number;
  activeWeddings: number;
  completedWeddings: number;
  totalRevenue: number;
  averageBudget: number;
  newWeddings30d: number;
  pendingTasks: number;
  overdueTasks: number;
  unreadMessages: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type:
    | 'wedding_created'
    | 'task_completed'
    | 'message_received'
    | 'payment_received';
  title: string;
  description: string;
  timestamp: string;
  entityId?: string;
  metadata: Record<string, unknown>;
}

export interface UpcomingWedding {
  id: string;
  companyName: string;
  contactName: string;
  weddingDate: string;
  status: string;
  daysUntil: number;
  budget: number;
  tasksCount: number;
  overdueTasks: number;
}

export interface TasksSummary {
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  upcoming: number;
  completed30d: number;
}

export interface MessagesSummary {
  unread: number;
  total30d: number;
  recentMessages: RecentMessage[];
}

export interface RecentMessage {
  id: string;
  senderName: string;
  subject: string;
  timestamp: string;
  isRead: boolean;
  weddingId: string;
  companyName: string;
}

export interface RevenueSummary {
  currentMonth: number;
  previousMonth: number;
  currentYear: number;
  previousYear: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  monthlyData: MonthlyRevenue[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  weddingsCount: number;
}

// Validation schemas
const widgetTypeSchema = z.enum([
  'summary',
  'upcoming_weddings',
  'recent_activity',
  'tasks',
  'messages',
  'revenue',
]);
const dashboardFiltersSchema = z.object({
  dateRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
  status: z.array(z.string()).optional(),
  weddingType: z.string().optional(),
});

export type WidgetType = z.infer<typeof widgetTypeSchema>;
export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;

export class DashboardService {
  private supabase: SupabaseClient;
  private cache: DashboardCache;
  private supplierId: string;

  constructor(supabase: SupabaseClient, supplierId: string) {
    this.supabase = supabase;
    this.cache = new DashboardCache();
    this.supplierId = supplierId;
  }

  /**
   * Get complete dashboard data with caching
   */
  async getDashboardData(
    filters: DashboardFilters = {},
  ): Promise<DashboardSummary> {
    const cacheKey = `dashboard:${this.supplierId}:${JSON.stringify(filters)}`;

    // Try to get from cache first
    const cached = await this.cache.get<DashboardSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch all dashboard data in parallel for performance
      const [
        summary,
        pendingTasks,
        overdueTasks,
        unreadMessages,
        recentActivity,
      ] = await Promise.all([
        this.getBasicSummary(filters),
        this.getPendingTasksCount(filters),
        this.getOverdueTasksCount(filters),
        this.getUnreadMessagesCount(filters),
        this.getRecentActivity(filters),
      ]);

      const dashboardData: DashboardSummary = {
        ...summary,
        pendingTasks,
        overdueTasks,
        unreadMessages,
        recentActivity,
      };

      // Cache for 5 minutes
      await this.cache.set(cacheKey, dashboardData, 300);

      return dashboardData;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  /**
   * Get basic summary metrics
   */
  private async getBasicSummary(
    filters: DashboardFilters,
  ): Promise<
    Omit<
      DashboardSummary,
      'pendingTasks' | 'overdueTasks' | 'unreadMessages' | 'recentActivity'
    >
  > {
    const { data: metrics, error } = await this.supabase
      .from('dashboard_metrics')
      .select('*')
      .eq('supplier_id', this.supplierId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch dashboard metrics: ${error.message}`);
    }

    // Fallback to real-time calculation if materialized view is not available
    if (!metrics) {
      return await this.calculateRealTimeSummary(filters);
    }

    return {
      totalWeddings: metrics.total_weddings || 0,
      activeWeddings: metrics.active_weddings || 0,
      completedWeddings:
        (metrics.total_weddings || 0) - (metrics.active_weddings || 0),
      totalRevenue: metrics.completed_revenue || 0,
      averageBudget: metrics.avg_budget || 0,
      newWeddings30d: metrics.new_weddings_30d || 0,
    };
  }

  /**
   * Calculate summary in real-time as fallback
   */
  private async calculateRealTimeSummary(
    filters: DashboardFilters,
  ): Promise<
    Omit<
      DashboardSummary,
      'pendingTasks' | 'overdueTasks' | 'unreadMessages' | 'recentActivity'
    >
  > {
    const { data: weddings, error } = await this.supabase
      .from('weddings')
      .select('id, status, budget, created_at')
      .eq('supplier_id', this.supplierId);

    if (error) {
      throw new Error(`Failed to fetch weddings data: ${error.message}`);
    }

    const totalWeddings = weddings?.length || 0;
    const activeWeddings =
      weddings?.filter((w) => w.status === 'active').length || 0;
    const completedWeddings =
      weddings?.filter((w) => w.status === 'completed').length || 0;

    const totalRevenue =
      weddings
        ?.filter((w) => w.status === 'completed')
        .reduce((sum, w) => sum + (w.budget || 0), 0) || 0;

    const averageBudget =
      totalWeddings > 0
        ? weddings.reduce((sum, w) => sum + (w.budget || 0), 0) / totalWeddings
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newWeddings30d =
      weddings?.filter((w) => new Date(w.created_at) > thirtyDaysAgo).length ||
      0;

    return {
      totalWeddings,
      activeWeddings,
      completedWeddings,
      totalRevenue,
      averageBudget,
      newWeddings30d,
    };
  }

  /**
   * Get upcoming weddings with task information
   */
  async getUpcomingWeddings(limit: number = 5): Promise<UpcomingWedding[]> {
    const cacheKey = `upcoming_weddings:${this.supplierId}:${limit}`;
    const cached = await this.cache.get<UpcomingWedding[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase
      .from('weddings')
      .select(
        `
        id,
        company_name,
        contact_name,
        wedding_date,
        status,
        budget,
        tasks!inner(id, status)
      `,
      )
      .eq('supplier_id', this.supplierId)
      .gte('wedding_date', new Date().toISOString())
      .order('wedding_date', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch upcoming weddings: ${error.message}`);
    }

    const upcomingWeddings: UpcomingWedding[] = (data || []).map((wedding) => {
      const weddingDate = new Date(wedding.wedding_date);
      const today = new Date();
      const daysUntil = Math.ceil(
        (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      const tasks = Array.isArray(wedding.tasks) ? wedding.tasks : [];
      const overdueTasks = tasks.filter(
        (task) => task.status === 'overdue',
      ).length;

      return {
        id: wedding.id,
        companyName: wedding.company_name || '',
        contactName: wedding.contact_name || '',
        weddingDate: wedding.wedding_date,
        status: wedding.status,
        daysUntil,
        budget: wedding.budget || 0,
        tasksCount: tasks.length,
        overdueTasks,
      };
    });

    await this.cache.set(cacheKey, upcomingWeddings, 600); // Cache for 10 minutes
    return upcomingWeddings;
  }

  /**
   * Get tasks summary
   */
  async getTasksSummary(): Promise<TasksSummary> {
    const cacheKey = `tasks_summary:${this.supplierId}`;
    const cached = await this.cache.get<TasksSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data: tasks, error } = await this.supabase
      .from('tasks')
      .select('id, status, due_date, completed_at')
      .eq('supplier_id', this.supplierId);

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const overdue =
      tasks?.filter(
        (task) =>
          task.status !== 'completed' &&
          task.due_date &&
          new Date(task.due_date) < today,
      ).length || 0;

    const dueToday =
      tasks?.filter(
        (task) =>
          task.status !== 'completed' &&
          task.due_date &&
          new Date(task.due_date).toDateString() === today.toDateString(),
      ).length || 0;

    const dueThisWeek =
      tasks?.filter(
        (task) =>
          task.status !== 'completed' &&
          task.due_date &&
          new Date(task.due_date) <= weekFromNow &&
          new Date(task.due_date) > today,
      ).length || 0;

    const upcoming =
      tasks?.filter(
        (task) =>
          task.status !== 'completed' &&
          task.due_date &&
          new Date(task.due_date) > weekFromNow,
      ).length || 0;

    const completed30d =
      tasks?.filter(
        (task) =>
          task.status === 'completed' &&
          task.completed_at &&
          new Date(task.completed_at) > thirtyDaysAgo,
      ).length || 0;

    const summary: TasksSummary = {
      overdue,
      dueToday,
      dueThisWeek,
      upcoming,
      completed30d,
    };

    await this.cache.set(cacheKey, summary, 300); // Cache for 5 minutes
    return summary;
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(
    filters: DashboardFilters,
    limit: number = 10,
  ): Promise<ActivityItem[]> {
    const cacheKey = `recent_activity:${this.supplierId}:${limit}`;
    const cached = await this.cache.get<ActivityItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase
      .from('dashboard_activity')
      .select('*')
      .eq('supplier_id', this.supplierId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent activity: ${error.message}`);
    }

    const activities: ActivityItem[] = (data || []).map((activity) => ({
      id: activity.id,
      type: activity.activity_type as ActivityItem['type'],
      title: activity.title,
      description: activity.description || '',
      timestamp: activity.created_at,
      entityId: activity.entity_id || undefined,
      metadata: activity.metadata || {},
    }));

    await this.cache.set(cacheKey, activities, 300); // Cache for 5 minutes
    return activities;
  }

  /**
   * Get pending tasks count
   */
  private async getPendingTasksCount(
    filters: DashboardFilters,
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', this.supplierId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to fetch pending tasks count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get overdue tasks count
   */
  private async getOverdueTasksCount(
    filters: DashboardFilters,
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', this.supplierId)
      .eq('status', 'overdue');

    if (error) {
      throw new Error(`Failed to fetch overdue tasks count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get unread messages count
   */
  private async getUnreadMessagesCount(
    filters: DashboardFilters,
  ): Promise<number> {
    const { count, error } = await this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', this.supplierId)
      .eq('is_read', false);

    if (error) {
      throw new Error(
        `Failed to fetch unread messages count: ${error.message}`,
      );
    }

    return count || 0;
  }

  /**
   * Log activity for dashboard updates
   */
  async logActivity(
    activityType: string,
    entityType: string,
    title: string,
    description?: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.supabase.from('dashboard_activity').insert({
      supplier_id: this.supplierId,
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      title,
      description,
      metadata: metadata || {},
    });

    if (error) {
      console.error('Error logging dashboard activity:', error);
      // Don't throw here as activity logging is not critical
    }
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateCache(pattern?: string): Promise<void> {
    const cachePattern = pattern || `*:${this.supplierId}:*`;
    await this.cache.invalidate(cachePattern);
  }

  /**
   * Get dashboard performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    cacheHitRate: number;
    avgResponseTime: number;
    totalQueries: number;
  }> {
    return await this.cache.getMetrics();
  }
}
