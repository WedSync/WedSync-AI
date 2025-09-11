/**
 * Widget Service - WS-037 Dashboard Widget Management
 * Team B - Round 2 Implementation
 * Handles widget configuration, positioning, and data aggregation
 */

import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { DashboardCache } from '@/lib/cache/dashboardCache';
import { z } from 'zod';

type SupabaseClient = ReturnType<typeof createClient>;

// Widget configuration schemas
const widgetConfigSchema = z.object({
  title: z.string().min(1).max(100),
  showMetrics: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
  daysAhead: z.number().min(1).max(365).optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
  showComparison: z.boolean().optional(),
  unreadOnly: z.boolean().optional(),
  showTypes: z.array(z.string()).optional(),
  refreshInterval: z.number().min(60).max(3600).optional(),
});

const widgetPositionSchema = z.object({
  position_x: z.number().min(0).max(12),
  position_y: z.number().min(0).max(12),
  width: z.number().min(1).max(12),
  height: z.number().min(1).max(6),
});

const widgetUpdateSchema = z
  .object({
    widget_config: widgetConfigSchema.optional(),
    is_enabled: z.boolean().optional(),
  })
  .merge(widgetPositionSchema.partial());

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;
export type WidgetPosition = z.infer<typeof widgetPositionSchema>;
export type WidgetUpdate = z.infer<typeof widgetUpdateSchema>;

// Widget type definitions
export interface DashboardWidget {
  id: string;
  supplier_id: string;
  widget_type: WidgetType;
  widget_config: WidgetConfig;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WidgetData {
  widget_id: string;
  widget_type: WidgetType;
  data: unknown;
  last_updated: string;
  cache_expires: string;
}

export type WidgetType =
  | 'summary'
  | 'upcoming_weddings'
  | 'recent_activity'
  | 'tasks'
  | 'messages'
  | 'revenue';

// Default widget configurations
const DEFAULT_WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  summary: {
    title: 'Dashboard Summary',
    showMetrics: [
      'total_weddings',
      'active_weddings',
      'total_revenue',
      'pending_tasks',
    ],
    refreshInterval: 300,
  },
  upcoming_weddings: {
    title: 'Upcoming Weddings',
    limit: 5,
    daysAhead: 30,
    refreshInterval: 600,
  },
  recent_activity: {
    title: 'Recent Activity',
    limit: 10,
    refreshInterval: 180,
  },
  tasks: {
    title: 'Tasks Overview',
    showTypes: ['overdue', 'due_today', 'due_this_week'],
    refreshInterval: 300,
  },
  messages: {
    title: 'Recent Messages',
    limit: 5,
    unreadOnly: true,
    refreshInterval: 120,
  },
  revenue: {
    title: 'Revenue Chart',
    period: 'month',
    showComparison: true,
    refreshInterval: 1800,
  },
};

// Default widget positions (12-column grid)
const DEFAULT_WIDGET_POSITIONS: Record<WidgetType, WidgetPosition> = {
  summary: { position_x: 0, position_y: 0, width: 6, height: 2 },
  upcoming_weddings: { position_x: 6, position_y: 0, width: 6, height: 3 },
  recent_activity: { position_x: 0, position_y: 2, width: 6, height: 3 },
  tasks: { position_x: 0, position_y: 5, width: 4, height: 2 },
  messages: { position_x: 4, position_y: 5, width: 4, height: 2 },
  revenue: { position_x: 8, position_y: 5, width: 4, height: 2 },
};

export class WidgetService {
  private supabase: SupabaseClient;
  private cache: DashboardCache;
  private supplierId: string;

  constructor(supabase: SupabaseClient, supplierId: string) {
    this.supabase = supabase;
    this.cache = new DashboardCache();
    this.supplierId = supplierId;
  }

  /**
   * Get all dashboard widgets for supplier
   */
  async getDashboardWidgets(): Promise<DashboardWidget[]> {
    const cacheKey = `widgets:config:${this.supplierId}`;
    const cached = await this.cache.get<DashboardWidget[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('supplier_id', this.supplierId)
      .order('position_y', { ascending: true })
      .order('position_x', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch dashboard widgets: ${error.message}`);
    }

    const widgets = data || [];

    // Cache for 10 minutes
    await this.cache.set(cacheKey, widgets, 600);

    return widgets as DashboardWidget[];
  }

  /**
   * Setup default dashboard widgets for new supplier
   */
  async setupDefaultDashboard(): Promise<DashboardWidget[]> {
    // Check if widgets already exist
    const existingWidgets = await this.getDashboardWidgets();
    if (existingWidgets.length > 0) {
      return existingWidgets;
    }

    const widgetInserts = Object.entries(DEFAULT_WIDGET_CONFIGS).map(
      ([type, config]) => {
        const position = DEFAULT_WIDGET_POSITIONS[type as WidgetType];

        return {
          supplier_id: this.supplierId,
          widget_type: type,
          widget_config: config,
          ...position,
          is_enabled: true,
        };
      },
    );

    const { data, error } = await this.supabase
      .from('dashboard_widgets')
      .insert(widgetInserts)
      .select();

    if (error) {
      throw new Error(`Failed to setup default dashboard: ${error.message}`);
    }

    // Invalidate cache
    await this.cache.invalidateWidget(this.supplierId);

    return data as DashboardWidget[];
  }

  /**
   * Update widget configuration
   */
  async updateWidget(
    widgetId: string,
    updates: WidgetUpdate,
  ): Promise<DashboardWidget> {
    // Validate update data
    const validatedUpdates = widgetUpdateSchema.parse(updates);

    const { data, error } = await this.supabase
      .from('dashboard_widgets')
      .update(validatedUpdates)
      .eq('id', widgetId)
      .eq('supplier_id', this.supplierId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update widget: ${error.message}`);
    }

    // Invalidate relevant caches
    await this.cache.invalidateWidget(this.supplierId);
    await this.cache.invalidateWidget(this.supplierId, data.widget_type);

    return data as DashboardWidget;
  }

  /**
   * Update widget positions (bulk operation for drag & drop)
   */
  async updateWidgetPositions(
    positions: Array<{
      id: string;
      position_x: number;
      position_y: number;
      width?: number;
      height?: number;
    }>,
  ): Promise<boolean> {
    const { error } = await this.supabase.rpc('update_widget_positions', {
      p_supplier_id: this.supplierId,
      p_positions: positions,
    });

    if (error) {
      throw new Error(`Failed to update widget positions: ${error.message}`);
    }

    // Invalidate cache
    await this.cache.invalidateWidget(this.supplierId);

    return true;
  }

  /**
   * Add new widget to dashboard
   */
  async addWidget(
    widgetType: WidgetType,
    config?: Partial<WidgetConfig>,
    position?: Partial<WidgetPosition>,
  ): Promise<DashboardWidget> {
    const defaultConfig = DEFAULT_WIDGET_CONFIGS[widgetType];
    const defaultPosition = DEFAULT_WIDGET_POSITIONS[widgetType];

    // Find available position if not specified
    const finalPosition = position
      ? { ...defaultPosition, ...position }
      : await this.findAvailablePosition();

    const widgetData = {
      supplier_id: this.supplierId,
      widget_type: widgetType,
      widget_config: { ...defaultConfig, ...config },
      ...finalPosition,
      is_enabled: true,
    };

    const { data, error } = await this.supabase
      .from('dashboard_widgets')
      .insert(widgetData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add widget: ${error.message}`);
    }

    // Invalidate cache
    await this.cache.invalidateWidget(this.supplierId);

    return data as DashboardWidget;
  }

  /**
   * Remove widget from dashboard
   */
  async removeWidget(widgetId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('dashboard_widgets')
      .delete()
      .eq('id', widgetId)
      .eq('supplier_id', this.supplierId);

    if (error) {
      throw new Error(`Failed to remove widget: ${error.message}`);
    }

    // Invalidate cache
    await this.cache.invalidateWidget(this.supplierId);

    return true;
  }

  /**
   * Get widget data with caching
   */
  async getWidgetData(
    widgetType: WidgetType,
    config?: WidgetConfig,
  ): Promise<WidgetData> {
    const cacheKey = `widget:data:${widgetType}:${this.supplierId}`;
    const cached = await this.cache.getWidgetData<unknown>(
      this.supplierId,
      widgetType,
    );

    if (cached) {
      return {
        widget_id: '',
        widget_type: widgetType,
        data: cached,
        last_updated: new Date().toISOString(),
        cache_expires: new Date(Date.now() + 300000).toISOString(), // 5 minutes
      };
    }

    let data: unknown;

    switch (widgetType) {
      case 'summary':
        data = await this.getSummaryData(config);
        break;
      case 'upcoming_weddings':
        data = await this.getUpcomingWeddingsData(config);
        break;
      case 'recent_activity':
        data = await this.getRecentActivityData(config);
        break;
      case 'tasks':
        data = await this.getTasksData(config);
        break;
      case 'messages':
        data = await this.getMessagesData(config);
        break;
      case 'revenue':
        data = await this.getRevenueData(config);
        break;
      default:
        throw new Error(`Unknown widget type: ${widgetType}`);
    }

    // Cache the data
    await this.cache.cacheWidgetData(this.supplierId, widgetType, data);

    return {
      widget_id: '',
      widget_type: widgetType,
      data,
      last_updated: new Date().toISOString(),
      cache_expires: new Date(Date.now() + 600000).toISOString(), // 10 minutes
    };
  }

  /**
   * Get summary widget data
   */
  private async getSummaryData(config?: WidgetConfig): Promise<unknown> {
    const metrics = config?.showMetrics || [
      'total_weddings',
      'active_weddings',
      'total_revenue',
    ];

    const { data: summaryData, error } = await this.supabase
      .from('dashboard_metrics')
      .select('*')
      .eq('supplier_id', this.supplierId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch summary data: ${error.message}`);
    }

    return {
      total_weddings: summaryData?.total_weddings || 0,
      active_weddings: summaryData?.active_weddings || 0,
      total_revenue: summaryData?.completed_revenue || 0,
      avg_budget: summaryData?.avg_budget || 0,
      new_weddings_30d: summaryData?.new_weddings_30d || 0,
      last_updated: summaryData?.last_updated || new Date().toISOString(),
      visible_metrics: metrics,
    };
  }

  /**
   * Get upcoming weddings widget data
   */
  private async getUpcomingWeddingsData(
    config?: WidgetConfig,
  ): Promise<unknown> {
    const limit = config?.limit || 5;
    const daysAhead = config?.daysAhead || 30;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const { data, error } = await this.supabase
      .from('weddings')
      .select('id, company_name, contact_name, wedding_date, status, budget')
      .eq('supplier_id', this.supplierId)
      .gte('wedding_date', new Date().toISOString())
      .lte('wedding_date', endDate.toISOString())
      .order('wedding_date', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch upcoming weddings: ${error.message}`);
    }

    return {
      weddings: data || [],
      total_upcoming: data?.length || 0,
      config: { limit, daysAhead },
    };
  }

  /**
   * Get recent activity widget data
   */
  private async getRecentActivityData(config?: WidgetConfig): Promise<unknown> {
    const limit = config?.limit || 10;

    const { data, error } = await this.supabase
      .from('dashboard_activity')
      .select('*')
      .eq('supplier_id', this.supplierId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent activity: ${error.message}`);
    }

    return {
      activities: data || [],
      total_shown: data?.length || 0,
      config: { limit },
    };
  }

  /**
   * Get tasks widget data
   */
  private async getTasksData(config?: WidgetConfig): Promise<unknown> {
    const showTypes = config?.showTypes || [
      'overdue',
      'due_today',
      'due_this_week',
    ];

    const { data: tasks, error } = await this.supabase
      .from('tasks')
      .select('id, status, due_date, title')
      .eq('supplier_id', this.supplierId)
      .neq('status', 'completed');

    if (error) {
      throw new Error(`Failed to fetch tasks data: ${error.message}`);
    }

    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    const overdue =
      tasks?.filter((task) => task.due_date && new Date(task.due_date) < today)
        .length || 0;

    const dueToday =
      tasks?.filter(
        (task) =>
          task.due_date &&
          new Date(task.due_date).toDateString() === today.toDateString(),
      ).length || 0;

    const dueThisWeek =
      tasks?.filter(
        (task) =>
          task.due_date &&
          new Date(task.due_date) > today &&
          new Date(task.due_date) <= weekFromNow,
      ).length || 0;

    return {
      overdue,
      due_today: dueToday,
      due_this_week: dueThisWeek,
      total_active: tasks?.length || 0,
      visible_types: showTypes,
    };
  }

  /**
   * Get messages widget data
   */
  private async getMessagesData(config?: WidgetConfig): Promise<unknown> {
    const limit = config?.limit || 5;
    const unreadOnly = config?.unreadOnly || false;

    let query = this.supabase
      .from('messages')
      .select('id, subject, sender_name, created_at, is_read')
      .eq('supplier_id', this.supplierId);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch messages data: ${error.message}`);
    }

    const unreadCount = unreadOnly
      ? data?.length || 0
      : data?.filter((msg) => !msg.is_read).length || 0;

    return {
      messages: data || [],
      unread_count: unreadCount,
      total_shown: data?.length || 0,
      config: { limit, unreadOnly },
    };
  }

  /**
   * Get revenue widget data
   */
  private async getRevenueData(config?: WidgetConfig): Promise<unknown> {
    const period = config?.period || 'month';
    const showComparison = config?.showComparison || false;

    // This is a simplified implementation - in production you'd want more sophisticated revenue tracking
    const { data: payments, error } = await this.supabase
      .from('payments')
      .select('amount, payment_date, status')
      .eq('supplier_id', this.supplierId)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch revenue data: ${error.message}`);
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthRevenue =
      payments
        ?.filter((payment) => {
          const paymentDate = new Date(payment.payment_date);
          return (
            paymentDate.getMonth() === currentMonth &&
            paymentDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, payment) => sum + payment.amount, 0) || 0;

    const previousMonthRevenue = showComparison
      ? payments
          ?.filter((payment) => {
            const paymentDate = new Date(payment.payment_date);
            return (
              paymentDate.getMonth() === currentMonth - 1 &&
              paymentDate.getFullYear() === currentYear
            );
          })
          .reduce((sum, payment) => sum + payment.amount, 0) || 0
      : 0;

    return {
      current_period: currentMonthRevenue,
      previous_period: previousMonthRevenue,
      change_percentage:
        previousMonthRevenue > 0
          ? ((currentMonthRevenue - previousMonthRevenue) /
              previousMonthRevenue) *
            100
          : 0,
      period,
      show_comparison: showComparison,
    };
  }

  /**
   * Find available position on dashboard grid
   */
  private async findAvailablePosition(): Promise<WidgetPosition> {
    const widgets = await this.getDashboardWidgets();
    const occupied = new Set<string>();

    // Mark occupied positions
    widgets.forEach((widget) => {
      for (
        let x = widget.position_x;
        x < widget.position_x + widget.width;
        x++
      ) {
        for (
          let y = widget.position_y;
          y < widget.position_y + widget.height;
          y++
        ) {
          occupied.add(`${x},${y}`);
        }
      }
    });

    // Find first available 2x1 position
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 11; x++) {
        if (!occupied.has(`${x},${y}`) && !occupied.has(`${x + 1},${y}`)) {
          return { position_x: x, position_y: y, width: 2, height: 1 };
        }
      }
    }

    // Fallback to bottom of grid
    return { position_x: 0, position_y: 12, width: 2, height: 1 };
  }

  /**
   * Validate widget layout (no overlaps)
   */
  async validateLayout(
    widgets: DashboardWidget[],
  ): Promise<{ valid: boolean; conflicts: string[] }> {
    const conflicts: string[] = [];
    const occupied = new Map<string, string>();

    for (const widget of widgets) {
      for (
        let x = widget.position_x;
        x < widget.position_x + widget.width;
        x++
      ) {
        for (
          let y = widget.position_y;
          y < widget.position_y + widget.height;
          y++
        ) {
          const position = `${x},${y}`;

          if (occupied.has(position)) {
            conflicts.push(
              `Widget ${widget.id} overlaps with ${occupied.get(position)} at position ${position}`,
            );
          } else {
            occupied.set(position, widget.id);
          }
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Export dashboard configuration
   */
  async exportDashboardConfig(): Promise<{
    widgets: DashboardWidget[];
    layout_version: string;
  }> {
    const widgets = await this.getDashboardWidgets();

    return {
      widgets,
      layout_version: '1.0',
    };
  }

  /**
   * Import dashboard configuration
   */
  async importDashboardConfig(config: {
    widgets: DashboardWidget[];
  }): Promise<boolean> {
    // Validate layout first
    const validation = await this.validateLayout(config.widgets);
    if (!validation.valid) {
      throw new Error(`Invalid layout: ${validation.conflicts.join(', ')}`);
    }

    // Clear existing widgets
    await this.supabase
      .from('dashboard_widgets')
      .delete()
      .eq('supplier_id', this.supplierId);

    // Insert new widgets
    const widgetInserts = config.widgets.map((widget) => ({
      supplier_id: this.supplierId,
      widget_type: widget.widget_type,
      widget_config: widget.widget_config,
      position_x: widget.position_x,
      position_y: widget.position_y,
      width: widget.width,
      height: widget.height,
      is_enabled: widget.is_enabled,
    }));

    const { error } = await this.supabase
      .from('dashboard_widgets')
      .insert(widgetInserts);

    if (error) {
      throw new Error(`Failed to import dashboard config: ${error.message}`);
    }

    // Invalidate cache
    await this.cache.invalidateWidget(this.supplierId);

    return true;
  }
}
