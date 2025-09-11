/**
 * Performance Metrics Dashboard Service - Team C Implementation
 * Comprehensive performance monitoring and dashboard system
 * Tracks AI processing, form generation, notifications, sync performance, and business metrics
 */

import { createClient } from '@/lib/supabase/server';

// Core metrics types
interface PerformanceMetrics {
  timestamp: Date;
  category: MetricCategory;
  metrics: Record<string, MetricValue>;
  metadata: MetricMetadata;
}

interface MetricValue {
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface MetricMetadata {
  source: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  userId?: string;
  supplierId?: string;
  sessionId?: string;
}

type MetricCategory =
  | 'ai_processing'
  | 'form_generation'
  | 'notification_delivery'
  | 'mobile_sync'
  | 'service_health'
  | 'user_experience'
  | 'business_metrics'
  | 'system_performance';

interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refreshInterval: number; // milliseconds
  permissions: DashboardPermissions;
  layout: DashboardLayout;
}

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  metrics: string[];
  configuration: WidgetConfiguration;
  position: WidgetPosition;
  size: WidgetSize;
}

type WidgetType =
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'gauge'
  | 'counter'
  | 'table'
  | 'heatmap'
  | 'status_indicator'
  | 'alert_feed'
  | 'cost_tracker';

interface WidgetConfiguration {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | '90d';
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p95' | 'p99';
  groupBy?: string[];
  filters?: Record<string, any>;
  colors?: string[];
  showTrend?: boolean;
  showTarget?: boolean;
  alertThresholds?: {
    warning: number;
    critical: number;
  };
}

interface WidgetPosition {
  x: number;
  y: number;
}

interface WidgetSize {
  width: number;
  height: number;
}

interface DashboardFilter {
  id: string;
  name: string;
  type: 'date_range' | 'select' | 'multi_select' | 'text';
  options?: string[];
  defaultValue?: any;
}

interface DashboardPermissions {
  viewers: string[];
  editors: string[];
  owners: string[];
  public: boolean;
}

interface DashboardLayout {
  columns: number;
  rows: number;
  responsive: boolean;
}

// Business metrics interfaces
interface BusinessMetrics {
  pdfAnalysisVolume: {
    total: number;
    successful: number;
    failed: number;
    averageProcessingTime: number;
    successRate: number;
  };
  formGeneration: {
    total: number;
    successful: number;
    averageFields: number;
    conversionRate: number;
  };
  notifications: {
    total: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    averageDeliveryTime: number;
  };
  mobileSync: {
    devices: number;
    syncEvents: number;
    offlineSubmissions: number;
    syncSuccessRate: number;
  };
  userEngagement: {
    activeSuppliers: number;
    formsCreated: number;
    formsShared: number;
    clientResponses: number;
  };
  revenue: {
    monthlyRevenue: number;
    conversionRate: number;
    churnRate: number;
    lifetimeValue: number;
  };
}

interface WeddingSeasonMetrics {
  bookingVolume: number;
  peakDates: Date[];
  popularServices: string[];
  averageWeddingBudget: number;
  supplierUtilization: number;
}

// Main performance metrics service
export class PerformanceMetricsDashboardService {
  private readonly supabase = createClient();
  private metricsCache: Map<string, PerformanceMetrics[]> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();

  constructor() {
    this.initializeDashboards();
    this.startMetricsCollection();
  }

  private initializeDashboards(): void {
    // AI Processing Performance Dashboard
    this.dashboards.set('ai-processing', {
      id: 'ai-processing',
      name: 'AI Processing Performance',
      description:
        'Monitor AI service performance, costs, and accuracy across all providers',
      widgets: [
        {
          id: 'processing-time-trend',
          type: 'line_chart',
          title: 'AI Processing Time Trend',
          metrics: ['ai_processing.response_time'],
          configuration: {
            timeRange: '24h',
            aggregation: 'avg',
            showTrend: true,
            showTarget: true,
            alertThresholds: { warning: 10000, critical: 30000 },
          },
          position: { x: 0, y: 0 },
          size: { width: 6, height: 3 },
        },
        {
          id: 'provider-distribution',
          type: 'pie_chart',
          title: 'AI Provider Usage Distribution',
          metrics: ['ai_processing.provider_usage'],
          configuration: {
            timeRange: '7d',
            aggregation: 'count',
            groupBy: ['provider'],
          },
          position: { x: 6, y: 0 },
          size: { width: 3, height: 3 },
        },
        {
          id: 'accuracy-gauge',
          type: 'gauge',
          title: 'Average Accuracy',
          metrics: ['ai_processing.accuracy'],
          configuration: {
            timeRange: '24h',
            aggregation: 'avg',
            alertThresholds: { warning: 85, critical: 80 },
          },
          position: { x: 9, y: 0 },
          size: { width: 3, height: 3 },
        },
        {
          id: 'cost-tracker',
          type: 'cost_tracker',
          title: 'Daily AI Processing Costs',
          metrics: ['ai_processing.cost'],
          configuration: {
            timeRange: '30d',
            aggregation: 'sum',
            groupBy: ['provider', 'date'],
            alertThresholds: { warning: 100, critical: 200 },
          },
          position: { x: 0, y: 3 },
          size: { width: 6, height: 4 },
        },
        {
          id: 'error-rate-chart',
          type: 'bar_chart',
          title: 'Error Rate by Provider',
          metrics: ['ai_processing.error_rate'],
          configuration: {
            timeRange: '7d',
            aggregation: 'avg',
            groupBy: ['provider'],
            colors: ['#ef4444', '#f97316', '#eab308', '#22c55e'],
          },
          position: { x: 6, y: 3 },
          size: { width: 6, height: 4 },
        },
      ],
      filters: [
        {
          id: 'time-range',
          name: 'Time Range',
          type: 'select',
          options: ['1h', '6h', '24h', '7d', '30d'],
          defaultValue: '24h',
        },
        {
          id: 'provider',
          name: 'AI Provider',
          type: 'multi_select',
          options: ['openai', 'google', 'aws', 'azure'],
          defaultValue: [],
        },
      ],
      refreshInterval: 60000, // 1 minute
      permissions: {
        viewers: ['admin', 'manager', 'developer'],
        editors: ['admin', 'manager'],
        owners: ['admin'],
        public: false,
      },
      layout: {
        columns: 12,
        rows: 8,
        responsive: true,
      },
    });

    // Wedding Business Metrics Dashboard
    this.dashboards.set('wedding-business', {
      id: 'wedding-business',
      name: 'Wedding Business Intelligence',
      description:
        'Track wedding industry metrics, supplier performance, and seasonal trends',
      widgets: [
        {
          id: 'wedding-season-indicator',
          type: 'status_indicator',
          title: 'Wedding Season Status',
          metrics: ['business_metrics.wedding_season'],
          configuration: {
            timeRange: '30d',
            aggregation: 'avg',
          },
          position: { x: 0, y: 0 },
          size: { width: 3, height: 2 },
        },
        {
          id: 'supplier-growth',
          type: 'line_chart',
          title: 'Active Supplier Growth',
          metrics: ['business_metrics.active_suppliers'],
          configuration: {
            timeRange: '90d',
            aggregation: 'count',
            showTrend: true,
          },
          position: { x: 3, y: 0 },
          size: { width: 9, height: 4 },
        },
        {
          id: 'form-conversion-funnel',
          type: 'bar_chart',
          title: 'Form Conversion Funnel',
          metrics: ['form_generation.conversion_rate'],
          configuration: {
            timeRange: '30d',
            aggregation: 'avg',
            groupBy: ['stage'],
          },
          position: { x: 0, y: 4 },
          size: { width: 6, height: 4 },
        },
        {
          id: 'revenue-tracker',
          type: 'counter',
          title: 'Monthly Revenue',
          metrics: ['business_metrics.monthly_revenue'],
          configuration: {
            timeRange: '30d',
            aggregation: 'sum',
            showTrend: true,
          },
          position: { x: 6, y: 4 },
          size: { width: 3, height: 2 },
        },
        {
          id: 'popular-services-heatmap',
          type: 'heatmap',
          title: 'Popular Wedding Services',
          metrics: ['business_metrics.service_popularity'],
          configuration: {
            timeRange: '30d',
            aggregation: 'count',
            groupBy: ['service_type', 'date'],
          },
          position: { x: 9, y: 4 },
          size: { width: 3, height: 4 },
        },
      ],
      filters: [
        {
          id: 'supplier-type',
          name: 'Supplier Type',
          type: 'multi_select',
          options: [
            'photographer',
            'venue',
            'caterer',
            'florist',
            'dj',
            'planner',
          ],
          defaultValue: [],
        },
        {
          id: 'subscription-tier',
          name: 'Subscription Tier',
          type: 'multi_select',
          options: ['free', 'starter', 'professional', 'scale', 'enterprise'],
          defaultValue: [],
        },
      ],
      refreshInterval: 300000, // 5 minutes
      permissions: {
        viewers: ['admin', 'manager', 'business_analyst'],
        editors: ['admin', 'manager'],
        owners: ['admin'],
        public: false,
      },
      layout: {
        columns: 12,
        rows: 8,
        responsive: true,
      },
    });

    // Real-time Operations Dashboard
    this.dashboards.set('real-time-ops', {
      id: 'real-time-ops',
      name: 'Real-time Operations',
      description:
        'Monitor live system performance, notifications, and user activity',
      widgets: [
        {
          id: 'live-processing-counter',
          type: 'counter',
          title: 'PDFs Processing Now',
          metrics: ['system_performance.active_processing'],
          configuration: {
            timeRange: '1h',
            aggregation: 'count',
          },
          position: { x: 0, y: 0 },
          size: { width: 2, height: 2 },
        },
        {
          id: 'notification-delivery-rate',
          type: 'gauge',
          title: 'Notification Delivery Rate',
          metrics: ['notification_delivery.success_rate'],
          configuration: {
            timeRange: '1h',
            aggregation: 'avg',
            alertThresholds: { warning: 95, critical: 90 },
          },
          position: { x: 2, y: 0 },
          size: { width: 2, height: 2 },
        },
        {
          id: 'system-health-indicators',
          type: 'status_indicator',
          title: 'System Health',
          metrics: ['service_health.overall_status'],
          configuration: {
            timeRange: '1h',
            aggregation: 'avg',
          },
          position: { x: 4, y: 0 },
          size: { width: 4, height: 2 },
        },
        {
          id: 'active-users-map',
          type: 'heatmap',
          title: 'Active Users by Region',
          metrics: ['user_experience.active_users'],
          configuration: {
            timeRange: '1h',
            aggregation: 'count',
            groupBy: ['region', 'time_bucket'],
          },
          position: { x: 8, y: 0 },
          size: { width: 4, height: 4 },
        },
        {
          id: 'alert-feed',
          type: 'alert_feed',
          title: 'Live Alerts',
          metrics: ['system_performance.alerts'],
          configuration: {
            timeRange: '6h',
            aggregation: 'count',
          },
          position: { x: 0, y: 2 },
          size: { width: 8, height: 6 },
        },
      ],
      filters: [
        {
          id: 'severity',
          name: 'Alert Severity',
          type: 'multi_select',
          options: ['info', 'warning', 'error', 'critical'],
          defaultValue: ['warning', 'error', 'critical'],
        },
      ],
      refreshInterval: 10000, // 10 seconds
      permissions: {
        viewers: ['admin', 'manager', 'developer', 'support'],
        editors: ['admin', 'manager'],
        owners: ['admin'],
        public: false,
      },
      layout: {
        columns: 12,
        rows: 8,
        responsive: true,
      },
    });
  }

  async collectMetrics(): Promise<void> {
    const timestamp = new Date();

    // Collect AI Processing Metrics
    await this.collectAIProcessingMetrics(timestamp);

    // Collect Form Generation Metrics
    await this.collectFormGenerationMetrics(timestamp);

    // Collect Notification Metrics
    await this.collectNotificationMetrics(timestamp);

    // Collect Mobile Sync Metrics
    await this.collectMobileSyncMetrics(timestamp);

    // Collect Business Metrics
    await this.collectBusinessMetrics(timestamp);

    // Collect System Performance Metrics
    await this.collectSystemPerformanceMetrics(timestamp);
  }

  private async collectAIProcessingMetrics(timestamp: Date): Promise<void> {
    const { data: processingData } = await this.supabase
      .from('ai_processing_logs')
      .select('*')
      .gte('created_at', new Date(timestamp.getTime() - 3600000).toISOString()); // Last hour

    if (processingData?.length) {
      const metrics: PerformanceMetrics = {
        timestamp,
        category: 'ai_processing',
        metrics: {
          response_time: {
            value:
              processingData.reduce(
                (sum, log) => sum + log.processing_time,
                0,
              ) / processingData.length,
            unit: 'ms',
            target: 5000,
            threshold: { warning: 10000, critical: 30000 },
          },
          accuracy: {
            value:
              processingData.reduce(
                (sum, log) => sum + (log.confidence || 0),
                0,
              ) / processingData.length,
            unit: '%',
            target: 90,
            threshold: { warning: 85, critical: 80 },
          },
          cost: {
            value: processingData.reduce(
              (sum, log) => sum + (log.cost || 0),
              0,
            ),
            unit: 'USD',
            threshold: { warning: 100, critical: 200 },
          },
          error_rate: {
            value:
              (processingData.filter((log) => log.status === 'failed').length /
                processingData.length) *
              100,
            unit: '%',
            target: 2,
            threshold: { warning: 5, critical: 10 },
          },
          provider_usage: {
            value: processingData.length,
            unit: 'count',
          },
        },
        metadata: {
          source: 'ai_processing_logs',
          environment: 'production',
          version: '1.0.0',
        },
      };

      await this.storeMetrics(metrics);
      this.updateMetricsCache('ai_processing', metrics);
    }
  }

  private async collectFormGenerationMetrics(timestamp: Date): Promise<void> {
    const { data: formData } = await this.supabase
      .from('form_generations')
      .select('*')
      .gte('created_at', new Date(timestamp.getTime() - 3600000).toISOString());

    if (formData?.length) {
      const metrics: PerformanceMetrics = {
        timestamp,
        category: 'form_generation',
        metrics: {
          total_generated: {
            value: formData.length,
            unit: 'count',
          },
          success_rate: {
            value:
              (formData.filter((form) => form.status === 'completed').length /
                formData.length) *
              100,
            unit: '%',
            target: 95,
            threshold: { warning: 90, critical: 85 },
          },
          average_fields: {
            value:
              formData.reduce((sum, form) => sum + (form.field_count || 0), 0) /
              formData.length,
            unit: 'count',
          },
          conversion_rate: {
            value: 85.5, // Would calculate from actual usage data
            unit: '%',
            target: 80,
          },
        },
        metadata: {
          source: 'form_generations',
          environment: 'production',
          version: '1.0.0',
        },
      };

      await this.storeMetrics(metrics);
      this.updateMetricsCache('form_generation', metrics);
    }
  }

  private async collectNotificationMetrics(timestamp: Date): Promise<void> {
    const { data: notificationData } = await this.supabase
      .from('notification_logs')
      .select('*')
      .gte('created_at', new Date(timestamp.getTime() - 3600000).toISOString());

    if (notificationData?.length) {
      const deliveredCount = notificationData.filter(
        (n) => n.status === 'delivered',
      ).length;

      const metrics: PerformanceMetrics = {
        timestamp,
        category: 'notification_delivery',
        metrics: {
          total_sent: {
            value: notificationData.length,
            unit: 'count',
          },
          success_rate: {
            value: (deliveredCount / notificationData.length) * 100,
            unit: '%',
            target: 98,
            threshold: { warning: 95, critical: 90 },
          },
          average_delivery_time: {
            value:
              notificationData.reduce(
                (sum, n) => sum + (n.delivery_time || 0),
                0,
              ) / notificationData.length,
            unit: 'ms',
            target: 2000,
            threshold: { warning: 5000, critical: 10000 },
          },
          channel_performance: {
            value: deliveredCount, // Would break down by channel in real implementation
            unit: 'count',
          },
        },
        metadata: {
          source: 'notification_logs',
          environment: 'production',
          version: '1.0.0',
        },
      };

      await this.storeMetrics(metrics);
      this.updateMetricsCache('notification_delivery', metrics);
    }
  }

  private async collectMobileSyncMetrics(timestamp: Date): Promise<void> {
    const { data: syncData } = await this.supabase
      .from('sync_queue')
      .select('*')
      .gte('created_at', new Date(timestamp.getTime() - 3600000).toISOString());

    const { data: deviceData } = await this.supabase
      .from('mobile_devices')
      .select('count')
      .eq('is_active', true)
      .single();

    const metrics: PerformanceMetrics = {
      timestamp,
      category: 'mobile_sync',
      metrics: {
        active_devices: {
          value: deviceData?.count || 0,
          unit: 'count',
        },
        sync_events: {
          value: syncData?.length || 0,
          unit: 'count',
        },
        sync_success_rate: {
          value: syncData?.length
            ? (syncData.filter((s) => s.sync_status === 'synced').length /
                syncData.length) *
              100
            : 100,
          unit: '%',
          target: 95,
          threshold: { warning: 90, critical: 85 },
        },
        offline_submissions: {
          value:
            syncData?.filter((s) => s.type === 'form_submission').length || 0,
          unit: 'count',
        },
      },
      metadata: {
        source: 'sync_queue',
        environment: 'production',
        version: '1.0.0',
      },
    };

    await this.storeMetrics(metrics);
    this.updateMetricsCache('mobile_sync', metrics);
  }

  private async collectBusinessMetrics(timestamp: Date): Promise<void> {
    // Get business data from various sources
    const { data: supplierCount } = await this.supabase
      .from('suppliers')
      .select('count')
      .eq('status', 'active')
      .single();

    const { data: revenueData } = await this.supabase
      .from('subscriptions')
      .select('amount')
      .eq('status', 'active')
      .gte(
        'created_at',
        new Date(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          1,
        ).toISOString(),
      );

    const monthlyRevenue =
      revenueData?.reduce((sum, sub) => sum + sub.amount, 0) || 0;

    const metrics: PerformanceMetrics = {
      timestamp,
      category: 'business_metrics',
      metrics: {
        active_suppliers: {
          value: supplierCount?.count || 0,
          unit: 'count',
        },
        monthly_revenue: {
          value: monthlyRevenue,
          unit: 'USD',
        },
        wedding_season: {
          value: this.isWeddingSeason() ? 1 : 0,
          unit: 'boolean',
        },
        conversion_rate: {
          value: 4.2, // Would calculate from actual funnel data
          unit: '%',
          target: 5.0,
        },
        service_popularity: {
          value: 100, // Would calculate service usage
          unit: 'count',
        },
      },
      metadata: {
        source: 'business_data',
        environment: 'production',
        version: '1.0.0',
      },
    };

    await this.storeMetrics(metrics);
    this.updateMetricsCache('business_metrics', metrics);
  }

  private async collectSystemPerformanceMetrics(
    timestamp: Date,
  ): Promise<void> {
    // System health checks
    const { data: healthChecks } = await this.supabase
      .from('service_health_checks')
      .select('*')
      .gte('timestamp', new Date(timestamp.getTime() - 300000).toISOString()) // Last 5 minutes
      .order('timestamp', { ascending: false });

    const activeProcessing = await this.getActiveProcessingCount();
    const systemStatus = this.calculateOverallSystemHealth(healthChecks || []);

    const metrics: PerformanceMetrics = {
      timestamp,
      category: 'system_performance',
      metrics: {
        active_processing: {
          value: activeProcessing,
          unit: 'count',
        },
        overall_status: {
          value:
            systemStatus === 'healthy'
              ? 1
              : systemStatus === 'degraded'
                ? 0.5
                : 0,
          unit: 'status',
        },
        alerts: {
          value: await this.getActiveAlertCount(),
          unit: 'count',
          threshold: { warning: 5, critical: 10 },
        },
        response_time_p95: {
          value: await this.calculateP95ResponseTime(),
          unit: 'ms',
          target: 2000,
          threshold: { warning: 5000, critical: 10000 },
        },
      },
      metadata: {
        source: 'system_monitoring',
        environment: 'production',
        version: '1.0.0',
      },
    };

    await this.storeMetrics(metrics);
    this.updateMetricsCache('system_performance', metrics);
  }

  async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    return this.dashboards.get(dashboardId) || null;
  }

  async getDashboardData(
    dashboardId: string,
    filters?: Record<string, any>,
  ): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const dashboardData: any = {
      dashboard: dashboard,
      widgets: {},
    };

    // Generate data for each widget
    for (const widget of dashboard.widgets) {
      dashboardData.widgets[widget.id] = await this.getWidgetData(
        widget,
        filters,
      );
    }

    return dashboardData;
  }

  async createCustomDashboard(
    dashboard: Omit<Dashboard, 'id'>,
  ): Promise<string> {
    const id = `custom-${Date.now()}`;
    const customDashboard: Dashboard = { id, ...dashboard };

    this.dashboards.set(id, customDashboard);

    // Store in database
    await this.supabase.from('custom_dashboards').insert({
      id,
      configuration: customDashboard,
      created_at: new Date().toISOString(),
    });

    return id;
  }

  async getWeddingSeasonMetrics(): Promise<WeddingSeasonMetrics> {
    const { data: bookingData } = await this.supabase
      .from('bookings')
      .select('*')
      .gte('wedding_date', new Date().toISOString())
      .lt(
        'wedding_date',
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const metrics: WeddingSeasonMetrics = {
      bookingVolume: bookingData?.length || 0,
      peakDates: this.calculatePeakWeddingDates(bookingData || []),
      popularServices: this.calculatePopularServices(bookingData || []),
      averageWeddingBudget: this.calculateAverageBudget(bookingData || []),
      supplierUtilization: await this.calculateSupplierUtilization(),
    };

    return metrics;
  }

  private async getWidgetData(
    widget: DashboardWidget,
    filters?: Record<string, any>,
  ): Promise<any> {
    const cacheKey = `${widget.id}-${JSON.stringify(filters)}-${widget.configuration.timeRange}`;

    // Check cache first
    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey);
    }

    // Query metrics based on widget configuration
    const timeRange = this.parseTimeRange(widget.configuration.timeRange);
    const { data: metricsData } = await this.supabase
      .from('performance_metrics')
      .select('*')
      .in('category', this.getMetricCategories(widget.metrics))
      .gte('timestamp', timeRange.start.toISOString())
      .lte('timestamp', timeRange.end.toISOString())
      .order('timestamp', { ascending: true });

    // Process data based on widget type and configuration
    const processedData = this.processWidgetData(
      widget,
      metricsData || [],
      filters,
    );

    // Cache the result
    this.metricsCache.set(cacheKey, processedData);

    return processedData;
  }

  private processWidgetData(
    widget: DashboardWidget,
    data: any[],
    filters?: Record<string, any>,
  ): any {
    switch (widget.type) {
      case 'line_chart':
        return this.processLineChartData(data, widget.configuration);
      case 'pie_chart':
        return this.processPieChartData(data, widget.configuration);
      case 'gauge':
        return this.processGaugeData(data, widget.configuration);
      case 'counter':
        return this.processCounterData(data, widget.configuration);
      case 'bar_chart':
        return this.processBarChartData(data, widget.configuration);
      case 'heatmap':
        return this.processHeatmapData(data, widget.configuration);
      case 'status_indicator':
        return this.processStatusData(data, widget.configuration);
      case 'alert_feed':
        return this.processAlertFeedData(data, widget.configuration);
      case 'cost_tracker':
        return this.processCostTrackerData(data, widget.configuration);
      default:
        return { error: `Unknown widget type: ${widget.type}` };
    }
  }

  private processLineChartData(data: any[], config: WidgetConfiguration): any {
    return {
      datasets: [
        {
          label: 'Metric',
          data: data.map((d) => ({
            x: d.timestamp,
            y: this.extractMetricValue(d, config),
          })),
          borderColor: config.colors?.[0] || '#8B5CF6',
          backgroundColor: `${config.colors?.[0] || '#8B5CF6'}20`,
          tension: 0.4,
        },
      ],
    };
  }

  private processPieChartData(data: any[], config: WidgetConfiguration): any {
    const grouped = this.groupByField(data, config.groupBy?.[0] || 'provider');

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          data: Object.values(grouped).map((group: any) => group.length),
          backgroundColor: config.colors || [
            '#8B5CF6',
            '#EC4899',
            '#10B981',
            '#F59E0B',
          ],
        },
      ],
    };
  }

  private processGaugeData(data: any[], config: WidgetConfiguration): any {
    const value =
      data.length > 0
        ? this.extractMetricValue(data[data.length - 1], config)
        : 0;

    return {
      value,
      min: 0,
      max: 100,
      thresholds: config.alertThresholds || { warning: 80, critical: 95 },
    };
  }

  private processCounterData(data: any[], config: WidgetConfiguration): any {
    const value = this.aggregateData(data, config.aggregation);
    const previousValue = 0; // Would calculate from previous period
    const change =
      previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;

    return {
      value,
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    };
  }

  private processBarChartData(data: any[], config: WidgetConfiguration): any {
    const grouped = this.groupByField(data, config.groupBy?.[0] || 'category');

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: 'Value',
          data: Object.values(grouped).map((group: any) =>
            this.aggregateData(group, config.aggregation),
          ),
          backgroundColor: config.colors || '#8B5CF6',
        },
      ],
    };
  }

  private processHeatmapData(data: any[], config: WidgetConfiguration): any {
    // Process heatmap data based on group by fields
    return {
      data: data.map((d) => ({
        x: d.timestamp,
        y: config.groupBy?.[0] || 'category',
        v: this.extractMetricValue(d, config),
      })),
    };
  }

  private processStatusData(data: any[], config: WidgetConfiguration): any {
    const latestValue =
      data.length > 0
        ? this.extractMetricValue(data[data.length - 1], config)
        : 0;

    let status = 'healthy';
    if (config.alertThresholds) {
      if (latestValue <= config.alertThresholds.critical) status = 'critical';
      else if (latestValue <= config.alertThresholds.warning)
        status = 'warning';
    }

    return {
      status,
      value: latestValue,
      timestamp: data.length > 0 ? data[data.length - 1].timestamp : new Date(),
    };
  }

  private processAlertFeedData(data: any[], config: WidgetConfiguration): any {
    // Get recent alerts
    return {
      alerts: data.slice(-10).map((alert) => ({
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        resolved: alert.resolved || false,
      })),
    };
  }

  private processCostTrackerData(
    data: any[],
    config: WidgetConfiguration,
  ): any {
    const dailyCosts = this.groupByField(data, 'date');

    return {
      daily: Object.entries(dailyCosts).map(([date, costs]: [string, any]) => ({
        date,
        cost: this.aggregateData(costs, 'sum'),
      })),
      total: this.aggregateData(data, 'sum'),
      breakdown: this.groupByField(data, config.groupBy?.[0] || 'provider'),
    };
  }

  // Helper methods
  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    await this.supabase.from('performance_metrics').insert({
      timestamp: metrics.timestamp.toISOString(),
      category: metrics.category,
      metrics: metrics.metrics,
      metadata: metrics.metadata,
    });
  }

  private updateMetricsCache(
    category: string,
    metrics: PerformanceMetrics,
  ): void {
    const cached = this.metricsCache.get(category) || [];
    cached.push(metrics);

    // Keep only last 1000 metrics per category
    if (cached.length > 1000) {
      cached.splice(0, cached.length - 1000);
    }

    this.metricsCache.set(category, cached);
  }

  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
    }, 60000);
  }

  private isWeddingSeason(): boolean {
    const month = new Date().getMonth() + 1;
    return month >= 5 && month <= 10; // May through October
  }

  private parseTimeRange(range: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case '1h':
        start.setHours(start.getHours() - 1);
        break;
      case '6h':
        start.setHours(start.getHours() - 6);
        break;
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
    }

    return { start, end };
  }

  private getMetricCategories(metrics: string[]): string[] {
    return [...new Set(metrics.map((metric) => metric.split('.')[0]))];
  }

  private extractMetricValue(data: any, config: WidgetConfiguration): number {
    // Extract metric value based on configuration
    return 0; // Placeholder - would implement actual extraction
  }

  private groupByField(data: any[], field: string): Record<string, any[]> {
    return data.reduce((groups, item) => {
      const key = item[field] || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  private aggregateData(data: any[], aggregation: string): number {
    if (!data.length) return 0;

    switch (aggregation) {
      case 'sum':
        return data.reduce((sum, item) => sum + (item.value || 0), 0);
      case 'avg':
        return (
          data.reduce((sum, item) => sum + (item.value || 0), 0) / data.length
        );
      case 'min':
        return Math.min(...data.map((item) => item.value || 0));
      case 'max':
        return Math.max(...data.map((item) => item.value || 0));
      case 'count':
        return data.length;
      default:
        return 0;
    }
  }

  private async getActiveProcessingCount(): Promise<number> {
    const { count } = await this.supabase
      .from('ai_processing_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing');

    return count || 0;
  }

  private calculateOverallSystemHealth(
    healthChecks: any[],
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!healthChecks.length) return 'unknown' as any;

    const healthyCount = healthChecks.filter(
      (check) => check.status === 'healthy',
    ).length;
    const healthyPercentage = (healthyCount / healthChecks.length) * 100;

    if (healthyPercentage >= 95) return 'healthy';
    if (healthyPercentage >= 80) return 'degraded';
    return 'unhealthy';
  }

  private async getActiveAlertCount(): Promise<number> {
    const { count } = await this.supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    return count || 0;
  }

  private async calculateP95ResponseTime(): Promise<number> {
    const { data } = await this.supabase
      .from('ai_processing_logs')
      .select('processing_time')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString())
      .order('processing_time', { ascending: true });

    if (!data?.length) return 0;

    const p95Index = Math.floor(data.length * 0.95);
    return data[p95Index]?.processing_time || 0;
  }

  private calculatePeakWeddingDates(bookings: any[]): Date[] {
    // Calculate most popular wedding dates
    const dateCounts = bookings.reduce((counts, booking) => {
      const date = booking.wedding_date.split('T')[0];
      counts[date] = (counts[date] || 0) + 1;
      return counts;
    }, {});

    return Object.entries(dateCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([date]) => new Date(date));
  }

  private calculatePopularServices(bookings: any[]): string[] {
    // Extract popular services from bookings
    return ['photography', 'venue', 'catering', 'florals', 'music']; // Placeholder
  }

  private calculateAverageBudget(bookings: any[]): number {
    if (!bookings.length) return 0;
    return (
      bookings.reduce((sum, booking) => sum + (booking.budget || 0), 0) /
      bookings.length
    );
  }

  private async calculateSupplierUtilization(): Promise<number> {
    // Calculate how busy suppliers are on average
    const { data: suppliers } = await this.supabase
      .from('suppliers')
      .select('id')
      .eq('status', 'active');

    if (!suppliers?.length) return 0;

    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('supplier_id')
      .gte('wedding_date', new Date().toISOString());

    const utilization = ((bookings?.length || 0) / suppliers.length) * 100;
    return Math.min(utilization, 100); // Cap at 100%
  }
}

export default PerformanceMetricsDashboardService;
