/**
 * WS-178: Backup Performance Monitor
 * Team D - Round 1: Performance tracking and optimization for backup operations
 *
 * Ensures backup operations never impact wedding planning activities
 * Monitors API response times, CPU, memory, and database performance
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { createClient } from '@supabase/supabase-js';

export interface PerformanceMetrics {
  timestamp: number;
  backupId: string;

  // API Performance
  apiResponseTime: {
    current: number;
    baseline: number;
    increase: number; // percentage
  };

  // System Resources
  systemMetrics: {
    cpuUsage: number; // percentage
    memoryUsage: number; // MB
    diskIO: {
      read: number; // MB/s
      write: number; // MB/s
    };
  };

  // Database Performance
  databaseMetrics: {
    connectionCount: number;
    queryLatency: number; // ms
    lockContention: number;
    activeQueries: number;
  };

  // Network Performance
  networkMetrics: {
    uploadSpeed: number; // Mbps
    downloadSpeed: number; // Mbps
    latency: number; // ms
  };

  // Wedding Context
  weddingContext: {
    isPeakHours: boolean;
    activeWeddings: number;
    criticalOperations: string[];
    vendorActivity: number;
  };
}

export interface PerformanceThresholds {
  apiResponseIncrease: number; // max 5%
  cpuUtilizationPeak: number; // max 30% during peak hours
  queryResponseIncrease: number; // max 20%
  memoryConsumption: number; // max 500MB
  uploadBandwidth: number; // max 10Mbps
}

export interface ImpactAnalysis {
  isImpacting: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedOperations: string[];
  recommendedActions: string[];
  estimatedRecoveryTime: number; // minutes
}

export interface ScheduleOptimization {
  nextOptimalWindow: Date;
  currentLoad: number;
  userActivityPattern: {
    photoUploads: number;
    vendorUpdates: number;
    coupleInteractions: number;
  };
  recommendedAction: 'proceed' | 'throttle' | 'postpone';
}

export class BackupPerformanceMonitor {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private performanceObserver: PerformanceObserver | null = null;
  private baselineMetrics: Map<string, number> = new Map();
  private currentMetrics: PerformanceMetrics | null = null;
  private monitoringActive = false;

  private readonly thresholds: PerformanceThresholds = {
    apiResponseIncrease: 5, // 5%
    cpuUtilizationPeak: 30, // 30%
    queryResponseIncrease: 20, // 20%
    memoryConsumption: 500, // 500MB
    uploadBandwidth: 10, // 10Mbps
  };

  constructor() {
    this.initializePerformanceObserver();
  }

  /**
   * Start monitoring backup performance
   */
  async startMonitoring(backupId: string): Promise<void> {
    console.log(`🔍 Starting backup performance monitoring for ${backupId}`);
    this.monitoringActive = true;

    // Capture baseline metrics before backup starts
    await this.captureBaselineMetrics();

    // Start continuous monitoring
    this.startContinuousMonitoring(backupId);
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring(): Promise<PerformanceMetrics | null> {
    console.log('🛑 Stopping backup performance monitoring');
    this.monitoringActive = false;

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    return this.currentMetrics;
  }

  /**
   * Monitor backup performance and track impact
   */
  async monitorBackupPerformance(
    backupId: string,
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();

    // Collect current system metrics
    const systemMetrics = await this.collectSystemMetrics();
    const databaseMetrics = await this.collectDatabaseMetrics();
    const networkMetrics = await this.collectNetworkMetrics();
    const weddingContext = await this.assessWeddingContext();

    // Calculate API performance impact
    const apiMetrics = await this.measureAPIPerformance();

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      backupId,
      apiResponseTime: apiMetrics,
      systemMetrics,
      databaseMetrics,
      networkMetrics,
      weddingContext,
    };

    this.currentMetrics = metrics;

    // Store metrics for historical analysis
    await this.storeMetrics(metrics);

    const endTime = performance.now();
    console.log(
      `📊 Performance monitoring completed in ${(endTime - startTime).toFixed(2)}ms`,
    );

    return metrics;
  }

  /**
   * Detect performance impact on user operations
   */
  async detectPerformanceImpact(): Promise<ImpactAnalysis> {
    if (!this.currentMetrics) {
      throw new Error('No current metrics available for impact analysis');
    }

    const metrics = this.currentMetrics;
    const impacts: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check API response time impact
    if (
      metrics.apiResponseTime.increase > this.thresholds.apiResponseIncrease
    ) {
      impacts.push(
        `API response time increased by ${metrics.apiResponseTime.increase.toFixed(1)}%`,
      );
      severity = metrics.apiResponseTime.increase > 10 ? 'high' : 'medium';
    }

    // Check CPU usage
    if (
      metrics.weddingContext.isPeakHours &&
      metrics.systemMetrics.cpuUsage > this.thresholds.cpuUtilizationPeak
    ) {
      impacts.push(
        `CPU usage at ${metrics.systemMetrics.cpuUsage.toFixed(1)}% during peak hours`,
      );
      severity = 'high';
    }

    // Check memory consumption
    if (metrics.systemMetrics.memoryUsage > this.thresholds.memoryConsumption) {
      impacts.push(
        `Memory usage at ${metrics.systemMetrics.memoryUsage.toFixed(0)}MB`,
      );
      severity = severity === 'high' ? 'critical' : 'medium';
    }

    // Check database performance
    if (
      metrics.databaseMetrics.queryLatency >
      (this.baselineMetrics.get('queryLatency') || 0) * 1.2
    ) {
      impacts.push(`Database query latency increased significantly`);
      severity = severity === 'critical' ? 'critical' : 'high';
    }

    const isImpacting = impacts.length > 0;

    const analysis: ImpactAnalysis = {
      isImpacting,
      severity,
      affectedOperations: this.identifyAffectedOperations(metrics),
      recommendedActions: this.generateRecommendations(metrics, severity),
      estimatedRecoveryTime: this.estimateRecoveryTime(severity),
    };

    if (isImpacting) {
      console.warn(`⚠️ Backup performance impact detected:`, impacts);
    }

    return analysis;
  }

  /**
   * Optimize backup scheduling based on system load and user activity
   */
  async optimizeBackupScheduling(): Promise<ScheduleOptimization> {
    const currentLoad = await this.getCurrentSystemLoad();
    const userActivity = await this.analyzeUserActivity();
    const weddingContext = await this.assessWeddingContext();

    // Calculate next optimal backup window
    const nextOptimalWindow = this.calculateOptimalWindow(
      userActivity,
      weddingContext,
    );

    let recommendedAction: 'proceed' | 'throttle' | 'postpone' = 'proceed';

    if (weddingContext.isPeakHours) {
      if (currentLoad > 70) {
        recommendedAction = 'postpone';
      } else if (currentLoad > 50) {
        recommendedAction = 'throttle';
      }
    }

    // Critical wedding operations take priority
    if (weddingContext.criticalOperations.length > 0) {
      recommendedAction = 'postpone';
    }

    return {
      nextOptimalWindow,
      currentLoad,
      userActivityPattern: userActivity,
      recommendedAction,
    };
  }

  /**
   * Initialize performance observer for continuous monitoring
   */
  private initializePerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'measure' && entry.name.startsWith('backup-')) {
          console.log(`⏱️ ${entry.name}: ${entry.duration.toFixed(2)}ms`);
        }
      }
    });

    this.performanceObserver.observe({
      entryTypes: ['measure', 'navigation', 'resource'],
    });
  }

  /**
   * Capture baseline performance metrics
   */
  private async captureBaselineMetrics(): Promise<void> {
    console.log('📋 Capturing baseline performance metrics');

    const baselineStart = performance.now();

    // Sample API response times
    const apiSamples = await this.sampleAPIResponseTimes();
    this.baselineMetrics.set('apiResponseTime', apiSamples.average);

    // Sample database query times
    const dbSamples = await this.sampleDatabasePerformance();
    this.baselineMetrics.set('queryLatency', dbSamples.average);

    // System resource baseline
    const systemMetrics = await this.collectSystemMetrics();
    this.baselineMetrics.set('cpuUsage', systemMetrics.cpuUsage);
    this.baselineMetrics.set('memoryUsage', systemMetrics.memoryUsage);

    const baselineEnd = performance.now();
    console.log(
      `✅ Baseline metrics captured in ${(baselineEnd - baselineStart).toFixed(2)}ms`,
    );
  }

  /**
   * Start continuous performance monitoring
   */
  private startContinuousMonitoring(backupId: string): void {
    const monitoringInterval = setInterval(async () => {
      if (!this.monitoringActive) {
        clearInterval(monitoringInterval);
        return;
      }

      try {
        await this.monitorBackupPerformance(backupId);
        const impact = await this.detectPerformanceImpact();

        if (impact.isImpacting && impact.severity === 'critical') {
          console.error('🚨 Critical performance impact detected!');
          // Trigger circuit breaker or emergency procedures
          this.triggerEmergencyProcedures(impact);
        }
      } catch (error) {
        console.error('❌ Error during continuous monitoring:', error);
      }
    }, 30000); // Monitor every 30 seconds during backup
  }

  /**
   * Collect current system metrics
   */
  private async collectSystemMetrics(): Promise<
    PerformanceMetrics['systemMetrics']
  > {
    // Use Node.js process metrics and system monitoring
    const memoryUsage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();

    return {
      cpuUsage,
      memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // Convert to MB
      diskIO: {
        read: await this.getDiskReadSpeed(),
        write: await this.getDiskWriteSpeed(),
      },
    };
  }

  /**
   * Collect database performance metrics
   */
  private async collectDatabaseMetrics(): Promise<
    PerformanceMetrics['databaseMetrics']
  > {
    try {
      const { data: connections } = await this.supabase.rpc(
        'get_connection_count',
      );
      const { data: queryStats } = await this.supabase.rpc('get_query_stats');

      return {
        connectionCount: connections || 0,
        queryLatency: queryStats?.avg_duration || 0,
        lockContention: queryStats?.lock_contention || 0,
        activeQueries: queryStats?.active_queries || 0,
      };
    } catch (error) {
      console.error('❌ Error collecting database metrics:', error);
      return {
        connectionCount: 0,
        queryLatency: 0,
        lockContention: 0,
        activeQueries: 0,
      };
    }
  }

  /**
   * Collect network performance metrics
   */
  private async collectNetworkMetrics(): Promise<
    PerformanceMetrics['networkMetrics']
  > {
    // Monitor network performance for backup operations
    return {
      uploadSpeed: await this.measureUploadSpeed(),
      downloadSpeed: await this.measureDownloadSpeed(),
      latency: await this.measureNetworkLatency(),
    };
  }

  /**
   * Assess wedding context and activity
   */
  private async assessWeddingContext(): Promise<
    PerformanceMetrics['weddingContext']
  > {
    const currentHour = new Date().getHours();
    const isPeakHours = currentHour >= 6 && currentHour <= 22;

    try {
      // Query active wedding operations
      const { data: activeWeddings } = await this.supabase
        .from('weddings')
        .select('id, status')
        .eq('status', 'active')
        .gte('wedding_date', new Date().toISOString());

      const { data: vendorActivity } = await this.supabase
        .from('vendor_activities')
        .select('count')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

      return {
        isPeakHours,
        activeWeddings: activeWeddings?.length || 0,
        criticalOperations: await this.identifyCriticalOperations(),
        vendorActivity: vendorActivity?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error assessing wedding context:', error);
      return {
        isPeakHours,
        activeWeddings: 0,
        criticalOperations: [],
        vendorActivity: 0,
      };
    }
  }

  /**
   * Measure API performance impact
   */
  private async measureAPIPerformance(): Promise<
    PerformanceMetrics['apiResponseTime']
  > {
    const samples = await this.sampleAPIResponseTimes();
    const baseline =
      this.baselineMetrics.get('apiResponseTime') || samples.average;
    const increase = ((samples.average - baseline) / baseline) * 100;

    return {
      current: samples.average,
      baseline,
      increase: Math.max(0, increase),
    };
  }

  /**
   * Sample API response times
   */
  private async sampleAPIResponseTimes(): Promise<{
    average: number;
    samples: number[];
  }> {
    const samples: number[] = [];
    const sampleCount = 5;

    for (let i = 0; i < sampleCount; i++) {
      const start = performance.now();
      try {
        await this.supabase.from('health_check').select('*').limit(1);
        const end = performance.now();
        samples.push(end - start);
      } catch (error) {
        // Skip failed samples
      }
    }

    const average =
      samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0;
    return { average, samples };
  }

  /**
   * Sample database performance
   */
  private async sampleDatabasePerformance(): Promise<{
    average: number;
    samples: number[];
  }> {
    const samples: number[] = [];
    const sampleCount = 3;

    for (let i = 0; i < sampleCount; i++) {
      const start = performance.now();
      try {
        await this.supabase.rpc('simple_query_test');
        const end = performance.now();
        samples.push(end - start);
      } catch (error) {
        // Skip failed samples
      }
    }

    const average =
      samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0;
    return { average, samples };
  }

  /**
   * Get current system load
   */
  private async getCurrentSystemLoad(): Promise<number> {
    const systemMetrics = await this.collectSystemMetrics();
    return Math.max(systemMetrics.cpuUsage, systemMetrics.memoryUsage / 10); // Normalized load
  }

  /**
   * Analyze user activity patterns
   */
  private async analyzeUserActivity(): Promise<
    ScheduleOptimization['userActivityPattern']
  > {
    try {
      const { data: photoUploads } = await this.supabase
        .from('photo_uploads')
        .select('count')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      const { data: vendorUpdates } = await this.supabase
        .from('vendor_updates')
        .select('count')
        .gte('updated_at', new Date(Date.now() - 3600000).toISOString());

      const { data: coupleInteractions } = await this.supabase
        .from('user_sessions')
        .select('count')
        .eq('user_type', 'couple')
        .gte('last_activity', new Date(Date.now() - 3600000).toISOString());

      return {
        photoUploads: photoUploads?.length || 0,
        vendorUpdates: vendorUpdates?.length || 0,
        coupleInteractions: coupleInteractions?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error analyzing user activity:', error);
      return {
        photoUploads: 0,
        vendorUpdates: 0,
        coupleInteractions: 0,
      };
    }
  }

  /**
   * Calculate optimal backup window
   */
  private calculateOptimalWindow(
    activity: ScheduleOptimization['userActivityPattern'],
    context: PerformanceMetrics['weddingContext'],
  ): Date {
    const now = new Date();

    // If not in peak hours and low activity, can proceed now
    if (
      !context.isPeakHours &&
      activity.photoUploads < 5 &&
      activity.vendorUpdates < 10
    ) {
      return now;
    }

    // Find next low-activity window
    const nextLowActivity = new Date(now);
    if (context.isPeakHours) {
      // Wait until off-peak hours (after 10 PM)
      nextLowActivity.setHours(22, 0, 0, 0);
      if (nextLowActivity <= now) {
        nextLowActivity.setDate(nextLowActivity.getDate() + 1);
      }
    } else {
      // Wait 2 hours for activity to decrease
      nextLowActivity.setHours(nextLowActivity.getHours() + 2);
    }

    return nextLowActivity;
  }

  /**
   * Store performance metrics for historical analysis
   */
  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.supabase.from('backup_performance_metrics').insert({
        backup_id: metrics.backupId,
        timestamp: new Date(metrics.timestamp).toISOString(),
        metrics: metrics,
      });
    } catch (error) {
      console.error('❌ Error storing performance metrics:', error);
    }
  }

  /**
   * Identify operations affected by performance degradation
   */
  private identifyAffectedOperations(metrics: PerformanceMetrics): string[] {
    const affected: string[] = [];

    if (metrics.apiResponseTime.increase > 5) {
      affected.push('API responses');
    }

    if (metrics.databaseMetrics.queryLatency > 1000) {
      affected.push('Database queries');
    }

    if (metrics.systemMetrics.memoryUsage > 500) {
      affected.push('Memory-intensive operations');
    }

    if (metrics.weddingContext.isPeakHours) {
      affected.push('Wedding planning activities');
    }

    return affected;
  }

  /**
   * Generate performance optimization recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics,
    severity: string,
  ): string[] {
    const recommendations: string[] = [];

    if (severity === 'critical') {
      recommendations.push('Immediately halt backup operations');
      recommendations.push('Activate circuit breaker protection');
    }

    if (metrics.systemMetrics.cpuUsage > this.thresholds.cpuUtilizationPeak) {
      recommendations.push('Reduce backup process CPU throttling');
    }

    if (metrics.databaseMetrics.connectionCount > 80) {
      recommendations.push('Limit database connections for backup operations');
    }

    if (metrics.weddingContext.isPeakHours) {
      recommendations.push('Schedule backup during off-peak hours');
    }

    return recommendations;
  }

  /**
   * Estimate recovery time based on severity
   */
  private estimateRecoveryTime(severity: string): number {
    switch (severity) {
      case 'critical':
        return 1; // 1 minute
      case 'high':
        return 5; // 5 minutes
      case 'medium':
        return 15; // 15 minutes
      default:
        return 30; // 30 minutes
    }
  }

  /**
   * Identify critical wedding operations that must not be interrupted
   */
  private async identifyCriticalOperations(): Promise<string[]> {
    const critical: string[] = [];

    try {
      // Check for active photo uploads
      const { data: uploads } = await this.supabase
        .from('photo_uploads')
        .select('status')
        .eq('status', 'uploading')
        .gte('created_at', new Date(Date.now() - 600000).toISOString()); // Last 10 minutes

      if (uploads && uploads.length > 0) {
        critical.push('Photo uploads in progress');
      }

      // Check for active timeline updates
      const { data: timelines } = await this.supabase
        .from('timeline_updates')
        .select('status')
        .eq('status', 'active')
        .gte('updated_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes

      if (timelines && timelines.length > 0) {
        critical.push('Timeline updates in progress');
      }

      return critical;
    } catch (error) {
      console.error('❌ Error identifying critical operations:', error);
      return [];
    }
  }

  /**
   * Trigger emergency procedures when critical performance issues detected
   */
  private async triggerEmergencyProcedures(
    impact: ImpactAnalysis,
  ): Promise<void> {
    console.error('🚨 Triggering emergency backup procedures');

    // Send critical alert
    await this.sendCriticalAlert(impact);

    // Log emergency event
    await this.supabase.from('backup_emergency_events').insert({
      timestamp: new Date().toISOString(),
      severity: impact.severity,
      affected_operations: impact.affectedOperations,
      recommended_actions: impact.recommendedActions,
    });
  }

  /**
   * Send critical performance alert
   */
  private async sendCriticalAlert(impact: ImpactAnalysis): Promise<void> {
    // Integration point for alert system
    console.error('📢 CRITICAL BACKUP PERFORMANCE ALERT:', {
      severity: impact.severity,
      operations: impact.affectedOperations,
      actions: impact.recommendedActions,
    });
  }

  // Helper methods for system metrics (would integrate with actual system monitoring)
  private async getCPUUsage(): Promise<number> {
    // Mock implementation - in production would use actual system monitoring
    return Math.random() * 100;
  }

  private async getDiskReadSpeed(): Promise<number> {
    // Mock implementation
    return Math.random() * 50;
  }

  private async getDiskWriteSpeed(): Promise<number> {
    // Mock implementation
    return Math.random() * 30;
  }

  private async measureUploadSpeed(): Promise<number> {
    // Mock implementation
    return Math.random() * 15;
  }

  private async measureDownloadSpeed(): Promise<number> {
    // Mock implementation
    return Math.random() * 50;
  }

  private async measureNetworkLatency(): Promise<number> {
    // Mock implementation
    return Math.random() * 100;
  }
}

export default BackupPerformanceMonitor;
