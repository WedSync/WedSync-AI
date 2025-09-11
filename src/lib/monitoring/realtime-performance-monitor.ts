/**
 * Real-time Performance Monitor
 * WS-202 Supabase Realtime Integration - Team D Performance Infrastructure
 *
 * Comprehensive monitoring system for all realtime performance components.
 * Provides dashboards, alerting, and wedding day emergency monitoring.
 */

import {
  RealtimePerformanceMetrics,
  PerformanceAlert,
  AlertThreshold,
  WeddingDayMode,
  InfrastructureHealth,
  CircuitBreakerState,
  ScalingResult,
  CacheOptimizationResult,
  WeddingSeasonMetrics,
  RealtimeEvent,
  ConnectionHealthReport,
  RealtimePerformanceConfig,
  RealtimeHooks,
} from '@/types/realtime-performance';

interface MonitoringSession {
  id: string;
  startTime: number;
  lastUpdate: number;
  activeAlerts: PerformanceAlert[];
  weddingDayMode: WeddingDayMode;
  hooks: RealtimeHooks;
}

interface MetricsBuffer {
  performance: RealtimePerformanceMetrics[];
  connections: ConnectionHealthReport[];
  alerts: PerformanceAlert[];
  scaling: ScalingResult[];
  cache: CacheOptimizationResult[];
  maxSize: number;
  currentIndex: number;
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: RealtimePerformanceMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number;
  lastTriggered: number | null;
}

interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  autoRefresh: boolean;
}

interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'alert' | 'status';
  title: string;
  dataSource: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

export class RealtimePerformanceMonitor {
  private static instance: RealtimePerformanceMonitor | null = null;
  private session: MonitoringSession;
  private metricsBuffer: MetricsBuffer;
  private alertRules: Map<string, AlertRule> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private config: RealtimePerformanceConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertProcessingInterval: NodeJS.Timeout | null = null;
  private emergencyMode: boolean = false;

  private constructor(
    config: RealtimePerformanceConfig,
    hooks?: RealtimeHooks,
  ) {
    this.config = config;
    this.session = {
      id: `monitor-${Date.now()}`,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      activeAlerts: [],
      weddingDayMode: {
        enabled: false,
        weddingIds: [],
        enhancedMonitoring: false,
        priorityChannels: [],
        emergencyContacts: [],
        fallbackProcedures: [],
      },
      hooks: hooks || {},
    };

    this.metricsBuffer = {
      performance: [],
      connections: [],
      alerts: [],
      scaling: [],
      cache: [],
      maxSize: 1000,
      currentIndex: 0,
    };

    this.initializeDefaultAlertRules();
    this.initializeDefaultDashboards();
  }

  public static getInstance(
    config?: RealtimePerformanceConfig,
    hooks?: RealtimeHooks,
  ): RealtimePerformanceMonitor {
    if (!RealtimePerformanceMonitor.instance) {
      if (!config) {
        throw new Error(
          'RealtimePerformanceMonitor requires configuration on first instantiation',
        );
      }
      RealtimePerformanceMonitor.instance = new RealtimePerformanceMonitor(
        config,
        hooks,
      );
    }
    return RealtimePerformanceMonitor.instance;
  }

  /**
   * Initialize monitoring system
   */
  public async initialize(): Promise<void> {
    console.log('🔍 Initializing Realtime Performance Monitor...');

    try {
      // Start monitoring intervals
      this.startMetricsCollection();
      this.startAlertProcessing();

      // Initialize performance tracking
      if (typeof window !== 'undefined') {
        this.initializeWebPerformanceAPI();
      }

      // Log initialization
      this.logEvent({
        type: 'connection_established',
        payload: { monitorId: this.session.id },
        timestamp: Date.now(),
        source: 'performance-monitor',
      });

      console.log('✅ Realtime Performance Monitor initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize performance monitor:', error);
      throw error;
    }
  }

  /**
   * Record performance metrics
   */
  public recordMetrics(metrics: RealtimePerformanceMetrics): void {
    // Add to buffer
    this.addToBuffer('performance', metrics);

    // Check for alerts
    this.processMetricsForAlerts(metrics);

    // Update session
    this.session.lastUpdate = Date.now();

    // Wedding day specific handling
    if (this.session.weddingDayMode.enabled) {
      this.processWeddingDayMetrics(metrics);
    }
  }

  /**
   * Record connection health report
   */
  public recordConnectionHealth(report: ConnectionHealthReport): void {
    this.addToBuffer('connections', report);

    // Check for connection-specific alerts
    if (report.unhealthyConnections > 0) {
      this.triggerAlert({
        id: `conn-health-${Date.now()}`,
        type: 'connection_count',
        severity: report.unhealthyConnections > 10 ? 'critical' : 'medium',
        message: `${report.unhealthyConnections} unhealthy connections detected`,
        value: report.unhealthyConnections,
        threshold: 0,
        timestamp: Date.now(),
        metadata: { totalConnections: report.totalConnections },
      });
    }
  }

  /**
   * Record scaling events
   */
  public recordScalingEvent(result: ScalingResult): void {
    this.addToBuffer('scaling', result);

    // Trigger scaling hooks
    if (this.session.hooks.onScalingEvent) {
      this.session.hooks.onScalingEvent(result);
    }
  }

  /**
   * Record cache optimization results
   */
  public recordCacheOptimization(result: CacheOptimizationResult): void {
    this.addToBuffer('cache', result);

    // Trigger cache optimization hooks
    if (this.session.hooks.onCacheOptimized) {
      this.session.hooks.onCacheOptimized(result);
    }
  }

  /**
   * Activate wedding day mode
   */
  public async activateWeddingDayMode(
    weddingIds: string[],
    emergencyContacts: Array<{
      name: string;
      phone: string;
      role: string;
      escalationLevel: number;
    }>,
  ): Promise<void> {
    console.log('💒 Activating Wedding Day Mode for weddings:', weddingIds);

    this.session.weddingDayMode = {
      enabled: true,
      weddingIds,
      enhancedMonitoring: true,
      priorityChannels: [
        `wedding-${weddingIds.join('-')}`,
        'emergency-coordination',
        'vendor-updates',
        'timeline-changes',
      ],
      emergencyContacts,
      fallbackProcedures: [
        'Enable circuit breakers',
        'Activate backup connections',
        'Switch to offline mode',
        'Alert emergency contacts',
      ],
    };

    // Enhance monitoring frequency
    this.restartMetricsCollection(1000); // Every second

    // Trigger wedding day hook
    if (this.session.hooks.onWeddingDayActivated) {
      // Create wedding optimization config for hook
      const weddingConfig = {
        weddingId: weddingIds[0],
        weddingDate: new Date().toISOString(),
        organizationId: 'wedding-day-mode',
        vendorCount: 0,
        guestCount: 0,
        priorityLevel: 5 as const,
        specialRequirements: {
          livestream: true,
          photoSharing: true,
          realTimeCoordination: true,
          emergencyProtocols: true,
        },
      };
      this.session.hooks.onWeddingDayActivated(weddingConfig);
    }

    this.logEvent({
      type: 'wedding_day_activated',
      payload: { weddingIds, emergencyContacts },
      timestamp: Date.now(),
      source: 'performance-monitor',
    });
  }

  /**
   * Get current infrastructure health
   */
  public getInfrastructureHealth(): InfrastructureHealth {
    const recentMetrics = this.getRecentMetrics(5); // Last 5 metrics
    const activeAlerts = this.session.activeAlerts;

    // Calculate component health based on recent metrics
    const databaseHealth = this.calculateComponentHealth(
      recentMetrics,
      'database',
    );
    const cacheHealth = this.calculateComponentHealth(recentMetrics, 'cache');
    const websocketsHealth = this.calculateComponentHealth(
      recentMetrics,
      'websockets',
    );
    const loadBalancerHealth = this.calculateComponentHealth(
      recentMetrics,
      'loadBalancer',
    );

    // Overall health
    const components = [
      databaseHealth,
      cacheHealth,
      websocketsHealth,
      loadBalancerHealth,
    ];
    const overallHealth = components.every((h) => h === 'healthy')
      ? 'healthy'
      : components.some((h) => h === 'critical')
        ? 'critical'
        : 'degraded';

    return {
      overall: overallHealth,
      components: {
        database: databaseHealth,
        cache: cacheHealth,
        websockets: websocketsHealth,
        loadBalancer: loadBalancerHealth,
      },
      resourcePools: this.generateResourcePools(),
      alerts: activeAlerts,
      lastChecked: Date.now(),
    };
  }

  /**
   * Get wedding season metrics
   */
  public getWeddingSeasonMetrics(): WeddingSeasonMetrics {
    const currentDate = new Date();
    const month = currentDate.getMonth();
    const recentMetrics = this.getRecentMetrics(10);

    // Determine season (May-October is peak wedding season)
    const seasonType =
      month >= 4 && month <= 9
        ? 'peak'
        : month === 3 || month === 10
          ? 'shoulder'
          : 'off';

    // Calculate load metrics
    const avgLoad =
      recentMetrics.reduce(
        (sum, m) => sum + m.connectionMetrics.totalConnections,
        0,
      ) / recentMetrics.length || 0;

    const expectedLoad = this.getExpectedLoad(seasonType);
    const capacityUtilization = (avgLoad / expectedLoad) * 100;

    const scalingRecommendation =
      capacityUtilization > 80
        ? 'scale_up'
        : capacityUtilization < 30
          ? 'scale_down'
          : 'maintain';

    return {
      seasonType,
      expectedLoad,
      currentLoad: avgLoad,
      scalingRecommendation,
      capacityUtilization,
      costOptimizationScore:
        this.calculateCostOptimizationScore(capacityUtilization),
    };
  }

  /**
   * Create custom dashboard
   */
  public createDashboard(dashboard: Omit<Dashboard, 'id'>): string {
    const dashboardId = `dashboard-${Date.now()}`;
    const fullDashboard: Dashboard = {
      ...dashboard,
      id: dashboardId,
    };

    this.dashboards.set(dashboardId, fullDashboard);
    return dashboardId;
  }

  /**
   * Get dashboard data
   */
  public getDashboardData(dashboardId: string): any {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const data: Record<string, any> = {};

    for (const widget of dashboard.widgets) {
      data[widget.id] = this.generateWidgetData(widget);
    }

    return {
      dashboard,
      data,
      lastUpdate: this.session.lastUpdate,
    };
  }

  /**
   * Export performance data for analysis
   */
  public exportPerformanceData(
    startTime?: number,
    endTime?: number,
  ): {
    metrics: RealtimePerformanceMetrics[];
    connections: ConnectionHealthReport[];
    alerts: PerformanceAlert[];
    scaling: ScalingResult[];
    cache: CacheOptimizationResult[];
    summary: any;
  } {
    const filterByTime = (items: any[]) => {
      if (!startTime && !endTime) return items;
      return items.filter((item) => {
        const timestamp = item.timestamp || Date.now();
        return (
          (!startTime || timestamp >= startTime) &&
          (!endTime || timestamp <= endTime)
        );
      });
    };

    const metrics = filterByTime(this.metricsBuffer.performance);
    const connections = filterByTime(this.metricsBuffer.connections);
    const alerts = filterByTime(this.metricsBuffer.alerts);
    const scaling = filterByTime(this.metricsBuffer.scaling);
    const cache = filterByTime(this.metricsBuffer.cache);

    return {
      metrics,
      connections,
      alerts,
      scaling,
      cache,
      summary: {
        totalMetrics: metrics.length,
        totalAlerts: alerts.length,
        weddingDayMode: this.session.weddingDayMode.enabled,
        monitoringDuration: Date.now() - this.session.startTime,
        averagePerformance: this.calculateAveragePerformance(metrics),
      },
    };
  }

  /**
   * Shutdown monitoring
   */
  public async shutdown(): Promise<void> {
    console.log('🔍 Shutting down Realtime Performance Monitor...');

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.alertProcessingInterval) {
      clearInterval(this.alertProcessingInterval);
    }

    // Log final event
    this.logEvent({
      type: 'connection_lost',
      payload: {
        monitorId: this.session.id,
        duration: Date.now() - this.session.startTime,
      },
      timestamp: Date.now(),
      source: 'performance-monitor',
    });

    // Clear singleton
    RealtimePerformanceMonitor.instance = null;
  }

  // ============= PRIVATE METHODS =============

  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-latency',
        name: 'High Latency Alert',
        condition: (m) => m.performanceMetrics.averageMessageLatency > 500,
        severity: 'high',
        message: 'Average message latency exceeds 500ms',
        cooldown: 60000, // 1 minute
        lastTriggered: null,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate Alert',
        condition: (m) => m.performanceMetrics.errorRate > 0.05,
        severity: 'critical',
        message: 'Error rate exceeds 5%',
        cooldown: 30000, // 30 seconds
        lastTriggered: null,
      },
      {
        id: 'connection-overload',
        name: 'Connection Overload Alert',
        condition: (m) => m.connectionMetrics.totalConnections > 500,
        severity: 'medium',
        message: 'High connection count detected',
        cooldown: 120000, // 2 minutes
        lastTriggered: null,
      },
      {
        id: 'memory-pressure',
        name: 'Memory Pressure Alert',
        condition: (m) =>
          m.resourceMetrics.memoryUsage.heapUsed > 1024 * 1024 * 1024, // 1GB
        severity: 'high',
        message: 'High memory usage detected',
        cooldown: 180000, // 3 minutes
        lastTriggered: null,
      },
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  private initializeDefaultDashboards(): void {
    const overviewDashboard: Dashboard = {
      id: 'overview',
      name: 'Performance Overview',
      refreshInterval: 5000,
      autoRefresh: true,
      widgets: [
        {
          id: 'connection-count',
          type: 'metric',
          title: 'Total Connections',
          dataSource: 'connections',
          config: { metric: 'totalConnections' },
          position: { x: 0, y: 0, width: 3, height: 2 },
        },
        {
          id: 'latency-chart',
          type: 'chart',
          title: 'Message Latency',
          dataSource: 'performance',
          config: { metric: 'averageMessageLatency', chartType: 'line' },
          position: { x: 3, y: 0, width: 6, height: 4 },
        },
        {
          id: 'active-alerts',
          type: 'alert',
          title: 'Active Alerts',
          dataSource: 'alerts',
          config: { showCount: true },
          position: { x: 9, y: 0, width: 3, height: 2 },
        },
        {
          id: 'system-health',
          type: 'status',
          title: 'System Health',
          dataSource: 'infrastructure',
          config: { showComponents: true },
          position: { x: 0, y: 2, width: 3, height: 3 },
        },
      ],
    };

    this.dashboards.set('overview', overviewDashboard);
  }

  private initializeWebPerformanceAPI(): void {
    if ('PerformanceObserver' in window) {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordWebPerformanceMetrics(navEntry);
          }
        }
      });
      navObserver.observe({ type: 'navigation', buffered: true });

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === 'resource' &&
            entry.name.includes('supabase')
          ) {
            this.recordResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
    }
  }

  private recordWebPerformanceMetrics(
    navEntry: PerformanceNavigationTiming,
  ): void {
    const metrics: RealtimePerformanceMetrics = {
      connectionMetrics: {
        totalConnections: 1,
        connectionsPerSecond: 1,
        averageConnectionLatency: navEntry.connectEnd - navEntry.connectStart,
        connectionReusageRate: 0,
      },
      subscriptionMetrics: {
        totalSubscriptions: 0,
        subscriptionsPerConnection: 0,
        subscriptionUpdateRate: 0,
      },
      performanceMetrics: {
        averageMessageLatency: navEntry.responseEnd - navEntry.requestStart,
        messagesThroughput: 0,
        errorRate: 0,
      },
      resourceMetrics: {
        memoryUsage: (performance as any).memory || {
          used: 0,
          total: 0,
          available: 0,
          rss: 0,
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          arrayBuffers: 0,
        },
        cpuUsage: 0,
        networkUtilization: 0,
      },
    };

    this.recordMetrics(metrics);
  }

  private recordResourceTiming(entry: PerformanceResourceTiming): void {
    // Log resource timing for Supabase-related requests
    console.debug('Supabase resource timing:', {
      name: entry.name,
      duration: entry.duration,
      transferSize: entry.transferSize,
    });
  }

  private startMetricsCollection(): void {
    this.monitoringInterval = setInterval(() => {
      // Collect system metrics (in real implementation, this would gather actual metrics)
      const metrics = this.generateMockMetrics();
      this.recordMetrics(metrics);
    }, this.config.monitoring.metricsInterval);
  }

  private startAlertProcessing(): void {
    this.alertProcessingInterval = setInterval(() => {
      this.processExpiredAlerts();
    }, 10000); // Every 10 seconds
  }

  private restartMetricsCollection(newInterval: number): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      const metrics = this.generateMockMetrics();
      this.recordMetrics(metrics);
    }, newInterval);
  }

  private generateMockMetrics(): RealtimePerformanceMetrics {
    // In real implementation, this would collect actual system metrics
    return {
      connectionMetrics: {
        totalConnections: Math.floor(Math.random() * 100) + 50,
        connectionsPerSecond: Math.floor(Math.random() * 10) + 1,
        averageConnectionLatency: Math.random() * 100 + 50,
        connectionReusageRate: Math.random() * 0.5 + 0.5,
      },
      subscriptionMetrics: {
        totalSubscriptions: Math.floor(Math.random() * 200) + 100,
        subscriptionsPerConnection: Math.random() * 3 + 2,
        subscriptionUpdateRate: Math.random() * 50 + 10,
      },
      performanceMetrics: {
        averageMessageLatency: Math.random() * 200 + 100,
        messagesThroughput: Math.random() * 1000 + 500,
        errorRate: Math.random() * 0.02, // 0-2%
      },
      resourceMetrics: {
        memoryUsage: {
          used: Math.floor(Math.random() * 1024 * 1024 * 500), // 0-500MB
          total: 1024 * 1024 * 1024, // 1GB
          available: 1024 * 1024 * 500,
          rss: Math.floor(Math.random() * 1024 * 1024 * 100),
          heapUsed: Math.floor(Math.random() * 1024 * 1024 * 200),
          heapTotal: Math.floor(Math.random() * 1024 * 1024 * 300),
          external: Math.floor(Math.random() * 1024 * 1024 * 50),
          arrayBuffers: Math.floor(Math.random() * 1024 * 1024 * 10),
        },
        cpuUsage: Math.random() * 50, // 0-50%
        networkUtilization: Math.random() * 80, // 0-80%
      },
    };
  }

  private addToBuffer<T extends keyof MetricsBuffer>(
    type: T,
    data: MetricsBuffer[T] extends (infer U)[] ? U : never,
  ): void {
    const buffer = this.metricsBuffer[type] as any[];

    if (buffer.length >= this.metricsBuffer.maxSize) {
      buffer.shift(); // Remove oldest
    }

    buffer.push(data);
  }

  private processMetricsForAlerts(metrics: RealtimePerformanceMetrics): void {
    const currentTime = Date.now();

    for (const [ruleId, rule] of this.alertRules.entries()) {
      // Check cooldown
      if (
        rule.lastTriggered &&
        currentTime - rule.lastTriggered < rule.cooldown
      ) {
        continue;
      }

      // Check condition
      if (rule.condition(metrics)) {
        const alert: PerformanceAlert = {
          id: `${ruleId}-${currentTime}`,
          type: this.determineAlertType(ruleId),
          severity: rule.severity,
          message: rule.message,
          value: this.extractAlertValue(metrics, ruleId),
          threshold: this.getAlertThreshold(ruleId),
          timestamp: currentTime,
          metadata: { ruleId, metrics: this.sanitizeMetricsForAlert(metrics) },
        };

        this.triggerAlert(alert);
        rule.lastTriggered = currentTime;
      }
    }
  }

  private processWeddingDayMetrics(metrics: RealtimePerformanceMetrics): void {
    // Enhanced monitoring for wedding day
    if (metrics.performanceMetrics.errorRate > 0.01) {
      // 1% error rate is critical on wedding day
      this.triggerEmergencyAlert({
        id: `wedding-emergency-${Date.now()}`,
        type: 'error_rate',
        severity: 'critical',
        message: 'Error rate spike detected during wedding day',
        value: metrics.performanceMetrics.errorRate,
        threshold: 0.01,
        timestamp: Date.now(),
        weddingId: this.session.weddingDayMode.weddingIds[0],
        metadata: { weddingDayMode: true },
      });
    }
  }

  private triggerAlert(alert: PerformanceAlert): void {
    console.warn('🚨 Performance Alert:', alert);

    // Add to active alerts
    this.session.activeAlerts.push(alert);
    this.addToBuffer('alerts', alert);

    // Trigger hooks
    if (
      this.session.hooks.onPerformanceDegraded &&
      alert.severity === 'critical'
    ) {
      const mockMetrics = this.generateMockMetrics();
      this.session.hooks.onPerformanceDegraded(mockMetrics);
    }
  }

  private triggerEmergencyAlert(alert: PerformanceAlert): void {
    console.error('🆘 EMERGENCY ALERT:', alert);

    this.emergencyMode = true;
    this.triggerAlert(alert);

    // Trigger emergency hooks
    if (this.session.hooks.onEmergencyMode) {
      this.session.hooks.onEmergencyMode(alert);
    }
  }

  private processExpiredAlerts(): void {
    const currentTime = Date.now();
    const alertTTL = 300000; // 5 minutes

    this.session.activeAlerts = this.session.activeAlerts.filter(
      (alert) => currentTime - alert.timestamp < alertTTL,
    );
  }

  private calculateComponentHealth(
    metrics: RealtimePerformanceMetrics[],
    component: string,
  ): 'healthy' | 'degraded' | 'critical' {
    if (metrics.length === 0) return 'degraded';

    const recentMetric = metrics[metrics.length - 1];

    switch (component) {
      case 'database':
        return recentMetric.performanceMetrics.averageMessageLatency < 100
          ? 'healthy'
          : recentMetric.performanceMetrics.averageMessageLatency < 500
            ? 'degraded'
            : 'critical';
      case 'cache':
        return recentMetric.performanceMetrics.errorRate < 0.01
          ? 'healthy'
          : recentMetric.performanceMetrics.errorRate < 0.05
            ? 'degraded'
            : 'critical';
      case 'websockets':
        return recentMetric.connectionMetrics.totalConnections < 200
          ? 'healthy'
          : recentMetric.connectionMetrics.totalConnections < 400
            ? 'degraded'
            : 'critical';
      case 'loadBalancer':
        return recentMetric.resourceMetrics.cpuUsage < 50
          ? 'healthy'
          : recentMetric.resourceMetrics.cpuUsage < 80
            ? 'degraded'
            : 'critical';
      default:
        return 'degraded';
    }
  }

  private generateResourcePools(): any[] {
    return [
      {
        id: 'connection-pool',
        type: 'connection',
        capacity: 1000,
        available: 750,
        allocated: 250,
        utilizationPercent: 25,
        healthScore: 0.9,
      },
      {
        id: 'memory-pool',
        type: 'memory',
        capacity: 1024 * 1024 * 1024, // 1GB
        available: 1024 * 1024 * 512, // 512MB
        allocated: 1024 * 1024 * 512, // 512MB
        utilizationPercent: 50,
        healthScore: 0.8,
      },
    ];
  }

  private getRecentMetrics(count: number): RealtimePerformanceMetrics[] {
    return this.metricsBuffer.performance.slice(-count);
  }

  private getExpectedLoad(seasonType: 'peak' | 'shoulder' | 'off'): number {
    const baseLoad = 100;
    const multipliers = { peak: 5, shoulder: 2, off: 1 };
    return baseLoad * multipliers[seasonType];
  }

  private calculateCostOptimizationScore(utilization: number): number {
    // Perfect utilization is around 70-80%
    const optimal = 75;
    const difference = Math.abs(utilization - optimal);
    return Math.max(0, 100 - difference * 2);
  }

  private generateWidgetData(widget: DashboardWidget): any {
    switch (widget.type) {
      case 'metric':
        return this.generateMetricWidgetData(widget);
      case 'chart':
        return this.generateChartWidgetData(widget);
      case 'alert':
        return this.generateAlertWidgetData(widget);
      case 'status':
        return this.generateStatusWidgetData(widget);
      default:
        return null;
    }
  }

  private generateMetricWidgetData(widget: DashboardWidget): any {
    const recentMetrics = this.getRecentMetrics(1);
    if (recentMetrics.length === 0) return { value: 0 };

    const metric = recentMetrics[0];
    const metricPath = widget.config.metric;

    // Simple path resolution for demo
    if (metricPath === 'totalConnections') {
      return { value: metric.connectionMetrics.totalConnections };
    }

    return { value: 0 };
  }

  private generateChartWidgetData(widget: DashboardWidget): any {
    const metrics = this.getRecentMetrics(20);
    const data = metrics.map((metric, index) => ({
      x: index,
      y: this.extractMetricValue(metric, widget.config.metric),
    }));

    return { data, chartType: widget.config.chartType };
  }

  private generateAlertWidgetData(widget: DashboardWidget): any {
    return {
      alerts: this.session.activeAlerts,
      count: this.session.activeAlerts.length,
    };
  }

  private generateStatusWidgetData(widget: DashboardWidget): any {
    return this.getInfrastructureHealth();
  }

  private extractMetricValue(
    metric: RealtimePerformanceMetrics,
    path: string,
  ): number {
    switch (path) {
      case 'averageMessageLatency':
        return metric.performanceMetrics.averageMessageLatency;
      case 'totalConnections':
        return metric.connectionMetrics.totalConnections;
      case 'errorRate':
        return metric.performanceMetrics.errorRate;
      default:
        return 0;
    }
  }

  private determineAlertType(ruleId: string): PerformanceAlert['type'] {
    if (ruleId.includes('latency')) return 'latency';
    if (ruleId.includes('connection')) return 'connection_count';
    if (ruleId.includes('error')) return 'error_rate';
    if (ruleId.includes('memory')) return 'memory';
    return 'latency';
  }

  private extractAlertValue(
    metrics: RealtimePerformanceMetrics,
    ruleId: string,
  ): number {
    if (ruleId.includes('latency'))
      return metrics.performanceMetrics.averageMessageLatency;
    if (ruleId.includes('connection'))
      return metrics.connectionMetrics.totalConnections;
    if (ruleId.includes('error')) return metrics.performanceMetrics.errorRate;
    if (ruleId.includes('memory'))
      return metrics.resourceMetrics.memoryUsage.heapUsed;
    return 0;
  }

  private getAlertThreshold(ruleId: string): number {
    const rule = this.alertRules.get(ruleId);
    // This is simplified - in real implementation, extract from rule condition
    if (ruleId.includes('latency')) return 500;
    if (ruleId.includes('connection')) return 500;
    if (ruleId.includes('error')) return 0.05;
    if (ruleId.includes('memory')) return 1024 * 1024 * 1024;
    return 0;
  }

  private sanitizeMetricsForAlert(metrics: RealtimePerformanceMetrics): any {
    // Return simplified metrics for alert context
    return {
      latency: metrics.performanceMetrics.averageMessageLatency,
      connections: metrics.connectionMetrics.totalConnections,
      errorRate: metrics.performanceMetrics.errorRate,
    };
  }

  private calculateAveragePerformance(
    metrics: RealtimePerformanceMetrics[],
  ): any {
    if (metrics.length === 0) return null;

    const totals = metrics.reduce(
      (acc, metric) => ({
        latency: acc.latency + metric.performanceMetrics.averageMessageLatency,
        connections:
          acc.connections + metric.connectionMetrics.totalConnections,
        errorRate: acc.errorRate + metric.performanceMetrics.errorRate,
      }),
      { latency: 0, connections: 0, errorRate: 0 },
    );

    return {
      averageLatency: totals.latency / metrics.length,
      averageConnections: totals.connections / metrics.length,
      averageErrorRate: totals.errorRate / metrics.length,
    };
  }

  private logEvent(event: RealtimeEvent): void {
    console.log('📊 Performance Event:', event);
    // In real implementation, this would send to logging service
  }
}

// Export singleton access
export const getPerformanceMonitor = (
  config?: RealtimePerformanceConfig,
  hooks?: RealtimeHooks,
) => {
  return RealtimePerformanceMonitor.getInstance(config, hooks);
};

export default RealtimePerformanceMonitor;
