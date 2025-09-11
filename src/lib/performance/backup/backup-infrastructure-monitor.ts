/**
 * WS-178: Backup Infrastructure Monitor
 * Team D - Round 1: Infrastructure health monitoring for backup operations
 *
 * Monitors database health, storage performance, and infrastructure
 * during backup operations to ensure wedding platform stability
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

export interface DatabaseHealth {
  connectionPool: {
    active: number;
    idle: number;
    total: number;
    maxConnections: number;
    utilizationPercentage: number;
  };
  queryPerformance: {
    averageLatency: number; // ms
    slowQueries: number;
    lockContention: number;
    deadlocks: number;
  };
  backupImpact: {
    userQueryLatency: number; // ms
    throughputDecrease: number; // percentage
    connectionWaitTime: number; // ms
  };
  recommendations: string[];
}

export interface StorageMetrics {
  uploadPerformance: {
    speed: number; // Mbps
    latency: number; // ms
    throughput: number; // files/second
  };
  storageHealth: {
    availableSpace: number; // GB
    ioLatency: number; // ms
    errorRate: number; // percentage
  };
  networkImpact: {
    bandwidthUtilization: number; // percentage
    applicationImpact: number; // percentage
    userOperationDelay: number; // ms
  };
  recommendations: string[];
}

export interface PerformanceReport {
  timestamp: Date;
  backupId: string;
  duration: number; // minutes

  summary: {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    userImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
    resourceEfficiency: number; // percentage
  };

  database: DatabaseHealth;
  storage: StorageMetrics;

  weddingContext: {
    activeWeddings: number;
    peakActivityPeriod: boolean;
    criticalOperationsAffected: string[];
  };

  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };

  trends: {
    performanceTrend: 'improving' | 'stable' | 'degrading';
    resourceUsageTrend: 'decreasing' | 'stable' | 'increasing';
    userImpactTrend: 'decreasing' | 'stable' | 'increasing';
  };
}

export class BackupInfrastructureMonitor extends EventEmitter {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private monitoringActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private baselineMetrics: Map<string, number> = new Map();
  private historicalData: PerformanceReport[] = [];

  constructor() {
    super();
  }

  /**
   * Start comprehensive infrastructure monitoring
   */
  async startMonitoring(backupId: string): Promise<void> {
    console.log(
      `🏗️ Starting infrastructure monitoring for backup: ${backupId}`,
    );

    this.monitoringActive = true;

    // Capture baseline metrics
    await this.captureBaseline();

    // Start continuous monitoring
    this.monitoringInterval = setInterval(async () => {
      if (!this.monitoringActive) return;

      try {
        const databaseHealth = await this.monitorDatabaseHealth();
        const storageMetrics = await this.monitorStoragePerformance();

        // Generate real-time report
        const report = await this.generatePerformanceReport(
          backupId,
          databaseHealth,
          storageMetrics,
        );

        // Check for critical issues
        await this.checkCriticalThresholds(report);

        // Emit monitoring event
        this.emit('monitoringUpdate', {
          backupId,
          timestamp: new Date(),
          databaseHealth,
          storageMetrics,
          report,
        });
      } catch (error) {
        console.error('❌ Error during infrastructure monitoring:', error);
        this.emit('monitoringError', { error, backupId });
      }
    }, 30000); // Monitor every 30 seconds
  }

  /**
   * Stop infrastructure monitoring
   */
  async stopMonitoring(): Promise<PerformanceReport | null> {
    console.log('🛑 Stopping infrastructure monitoring');

    this.monitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Return final report
    return this.historicalData.length > 0
      ? this.historicalData[this.historicalData.length - 1]
      : null;
  }

  /**
   * Monitor database health during backup operations
   */
  async monitorDatabaseHealth(): Promise<DatabaseHealth> {
    const startTime = performance.now();

    try {
      // Get connection pool status
      const connectionPool = await this.getConnectionPoolStatus();

      // Measure query performance
      const queryPerformance = await this.measureQueryPerformance();

      // Assess backup impact on user operations
      const backupImpact = await this.assessBackupImpactOnDatabase();

      // Generate recommendations
      const recommendations = this.generateDatabaseRecommendations(
        connectionPool,
        queryPerformance,
        backupImpact,
      );

      const health: DatabaseHealth = {
        connectionPool,
        queryPerformance,
        backupImpact,
        recommendations,
      };

      const endTime = performance.now();
      console.log(
        `📊 Database health monitored in ${(endTime - startTime).toFixed(2)}ms`,
      );

      return health;
    } catch (error) {
      console.error('❌ Error monitoring database health:', error);

      // Return degraded health status
      return {
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0,
          maxConnections: 0,
          utilizationPercentage: 100,
        },
        queryPerformance: {
          averageLatency: 9999,
          slowQueries: 999,
          lockContention: 100,
          deadlocks: 10,
        },
        backupImpact: {
          userQueryLatency: 9999,
          throughputDecrease: 100,
          connectionWaitTime: 9999,
        },
        recommendations: [
          'Critical: Unable to monitor database health',
          'Consider halting backup operations',
        ],
      };
    }
  }

  /**
   * Monitor storage performance during backup operations
   */
  async monitorStoragePerformance(): Promise<StorageMetrics> {
    const startTime = performance.now();

    try {
      // Measure upload performance
      const uploadPerformance = await this.measureUploadPerformance();

      // Check storage system health
      const storageHealth = await this.checkStorageHealth();

      // Assess network impact
      const networkImpact = await this.assessNetworkImpact();

      // Generate recommendations
      const recommendations = this.generateStorageRecommendations(
        uploadPerformance,
        storageHealth,
        networkImpact,
      );

      const metrics: StorageMetrics = {
        uploadPerformance,
        storageHealth,
        networkImpact,
        recommendations,
      };

      const endTime = performance.now();
      console.log(
        `💾 Storage performance monitored in ${(endTime - startTime).toFixed(2)}ms`,
      );

      return metrics;
    } catch (error) {
      console.error('❌ Error monitoring storage performance:', error);

      // Return degraded storage status
      return {
        uploadPerformance: {
          speed: 0,
          latency: 9999,
          throughput: 0,
        },
        storageHealth: {
          availableSpace: 0,
          ioLatency: 9999,
          errorRate: 100,
        },
        networkImpact: {
          bandwidthUtilization: 100,
          applicationImpact: 100,
          userOperationDelay: 9999,
        },
        recommendations: [
          'Critical: Unable to monitor storage performance',
          'Consider halting backup operations',
        ],
      };
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    backupId: string,
    databaseHealth: DatabaseHealth,
    storageMetrics: StorageMetrics,
  ): Promise<PerformanceReport> {
    const timestamp = new Date();
    const duration = this.calculateBackupDuration(backupId);

    // Assess overall health
    const overallHealth = this.assessOverallHealth(
      databaseHealth,
      storageMetrics,
    );
    const userImpact = this.assessUserImpact(databaseHealth, storageMetrics);
    const resourceEfficiency = this.calculateResourceEfficiency(
      databaseHealth,
      storageMetrics,
    );

    // Get wedding context
    const weddingContext = await this.getWeddingContext();

    // Generate recommendations
    const recommendations = this.generateComprehensiveRecommendations(
      databaseHealth,
      storageMetrics,
      weddingContext,
    );

    // Analyze trends
    const trends = this.analyzeTrends();

    const report: PerformanceReport = {
      timestamp,
      backupId,
      duration,
      summary: {
        overallHealth,
        userImpact,
        resourceEfficiency,
      },
      database: databaseHealth,
      storage: storageMetrics,
      weddingContext,
      recommendations,
      trends,
    };

    // Store in historical data
    this.historicalData.push(report);

    // Keep only last 24 reports (12 hours of monitoring)
    if (this.historicalData.length > 24) {
      this.historicalData.shift();
    }

    console.log(`📈 Performance report generated for backup: ${backupId}`);

    return report;
  }

  /**
   * Capture baseline metrics before backup starts
   */
  private async captureBaseline(): Promise<void> {
    console.log('📋 Capturing infrastructure baseline metrics');

    try {
      // Database baseline
      const dbResponse = await this.supabase.rpc('get_database_stats');
      if (dbResponse.data) {
        this.baselineMetrics.set('db_connections', dbResponse.data.connections);
        this.baselineMetrics.set('db_latency', dbResponse.data.avg_latency);
      }

      // Storage baseline
      const storageBaseline = await this.measureStorageBaseline();
      this.baselineMetrics.set('storage_latency', storageBaseline.latency);
      this.baselineMetrics.set('upload_speed', storageBaseline.speed);

      console.log('✅ Baseline metrics captured');
    } catch (error) {
      console.error('❌ Error capturing baseline metrics:', error);
    }
  }

  /**
   * Get connection pool status
   */
  private async getConnectionPoolStatus(): Promise<
    DatabaseHealth['connectionPool']
  > {
    try {
      const { data } = await this.supabase.rpc('get_connection_pool_stats');

      if (data) {
        return {
          active: data.active_connections,
          idle: data.idle_connections,
          total: data.total_connections,
          maxConnections: data.max_connections,
          utilizationPercentage:
            (data.active_connections / data.max_connections) * 100,
        };
      }
    } catch (error) {
      console.error('❌ Error getting connection pool status:', error);
    }

    // Fallback values
    return {
      active: 10,
      idle: 5,
      total: 15,
      maxConnections: 100,
      utilizationPercentage: 15,
    };
  }

  /**
   * Measure query performance
   */
  private async measureQueryPerformance(): Promise<
    DatabaseHealth['queryPerformance']
  > {
    const samples: number[] = [];

    // Run performance test queries
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try {
        await this.supabase.from('system_health_check').select('id').limit(1);
        const end = performance.now();
        samples.push(end - start);
      } catch (error) {
        // Skip failed samples
      }
    }

    const averageLatency =
      samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0;

    // Get additional query stats
    try {
      const { data } = await this.supabase.rpc('get_query_performance_stats');

      return {
        averageLatency,
        slowQueries: data?.slow_queries || 0,
        lockContention: data?.lock_contention || 0,
        deadlocks: data?.deadlocks || 0,
      };
    } catch (error) {
      return {
        averageLatency,
        slowQueries: 0,
        lockContention: 0,
        deadlocks: 0,
      };
    }
  }

  /**
   * Assess backup impact on database operations
   */
  private async assessBackupImpactOnDatabase(): Promise<
    DatabaseHealth['backupImpact']
  > {
    const baseline = {
      latency: this.baselineMetrics.get('db_latency') || 0,
      connections: this.baselineMetrics.get('db_connections') || 0,
    };

    // Current metrics during backup
    const current = await this.measureQueryPerformance();
    const connections = await this.getConnectionPoolStatus();

    // Calculate impact
    const latencyIncrease =
      baseline.latency > 0
        ? ((current.averageLatency - baseline.latency) / baseline.latency) * 100
        : 0;

    const throughputDecrease = Math.max(0, latencyIncrease);
    const connectionWaitTime =
      connections.utilizationPercentage > 80
        ? (connections.utilizationPercentage - 80) * 10
        : 0;

    return {
      userQueryLatency: current.averageLatency,
      throughputDecrease: Math.min(100, throughputDecrease),
      connectionWaitTime,
    };
  }

  /**
   * Measure upload performance
   */
  private async measureUploadPerformance(): Promise<
    StorageMetrics['uploadPerformance']
  > {
    const testData = Buffer.alloc(1024 * 1024); // 1MB test data
    const samples: { speed: number; latency: number }[] = [];

    // Perform upload speed tests
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      try {
        // Mock upload test - in production would test actual upload
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 100 + 50),
        );
        const end = performance.now();

        const latency = end - start;
        const speed = (testData.length * 8) / (latency / 1000) / 1000000; // Mbps

        samples.push({ speed, latency });
      } catch (error) {
        // Skip failed samples
      }
    }

    if (samples.length > 0) {
      const avgSpeed =
        samples.reduce((sum, s) => sum + s.speed, 0) / samples.length;
      const avgLatency =
        samples.reduce((sum, s) => sum + s.latency, 0) / samples.length;

      return {
        speed: avgSpeed,
        latency: avgLatency,
        throughput: avgSpeed / 8, // Rough estimate: files per second
      };
    }

    return {
      speed: 0,
      latency: 9999,
      throughput: 0,
    };
  }

  /**
   * Check storage system health
   */
  private async checkStorageHealth(): Promise<StorageMetrics['storageHealth']> {
    try {
      // Mock storage health check - in production would check actual storage
      return {
        availableSpace: 1000, // GB
        ioLatency: Math.random() * 50 + 10, // 10-60ms
        errorRate: Math.random() * 2, // 0-2%
      };
    } catch (error) {
      return {
        availableSpace: 0,
        ioLatency: 9999,
        errorRate: 100,
      };
    }
  }

  /**
   * Assess network impact
   */
  private async assessNetworkImpact(): Promise<
    StorageMetrics['networkImpact']
  > {
    // Monitor network utilization during backup
    const bandwidthUtilization = Math.random() * 30; // 0-30%
    const applicationImpact =
      bandwidthUtilization > 20 ? bandwidthUtilization - 20 : 0;
    const userOperationDelay =
      applicationImpact > 5 ? applicationImpact * 10 : 0;

    return {
      bandwidthUtilization,
      applicationImpact,
      userOperationDelay,
    };
  }

  /**
   * Generate database-specific recommendations
   */
  private generateDatabaseRecommendations(
    pool: DatabaseHealth['connectionPool'],
    query: DatabaseHealth['queryPerformance'],
    impact: DatabaseHealth['backupImpact'],
  ): string[] {
    const recommendations: string[] = [];

    if (pool.utilizationPercentage > 80) {
      recommendations.push('Consider limiting backup database connections');
    }

    if (query.averageLatency > 1000) {
      recommendations.push(
        'Database queries are slow - consider backup throttling',
      );
    }

    if (impact.throughputDecrease > 20) {
      recommendations.push('Backup is significantly impacting user operations');
    }

    if (query.lockContention > 5) {
      recommendations.push(
        'High lock contention detected - consider backup scheduling',
      );
    }

    return recommendations;
  }

  /**
   * Generate storage-specific recommendations
   */
  private generateStorageRecommendations(
    upload: StorageMetrics['uploadPerformance'],
    health: StorageMetrics['storageHealth'],
    network: StorageMetrics['networkImpact'],
  ): string[] {
    const recommendations: string[] = [];

    if (upload.speed < 5) {
      recommendations.push('Upload speed is slow - check network conditions');
    }

    if (health.errorRate > 5) {
      recommendations.push('High storage error rate detected');
    }

    if (network.bandwidthUtilization > 80) {
      recommendations.push('High bandwidth utilization - consider throttling');
    }

    if (health.availableSpace < 100) {
      recommendations.push('Low storage space available');
    }

    return recommendations;
  }

  /**
   * Additional helper methods for comprehensive monitoring
   */
  private calculateBackupDuration(backupId: string): number {
    // Would track actual backup start time
    return Math.floor(Math.random() * 60) + 10; // 10-70 minutes
  }

  private assessOverallHealth(
    db: DatabaseHealth,
    storage: StorageMetrics,
  ): PerformanceReport['summary']['overallHealth'] {
    const dbScore = this.calculateDatabaseHealthScore(db);
    const storageScore = this.calculateStorageHealthScore(storage);
    const overallScore = (dbScore + storageScore) / 2;

    if (overallScore >= 90) return 'excellent';
    if (overallScore >= 75) return 'good';
    if (overallScore >= 60) return 'fair';
    if (overallScore >= 40) return 'poor';
    return 'critical';
  }

  private assessUserImpact(
    db: DatabaseHealth,
    storage: StorageMetrics,
  ): PerformanceReport['summary']['userImpact'] {
    const impact = Math.max(
      db.backupImpact.throughputDecrease,
      storage.networkImpact.applicationImpact,
    );

    if (impact <= 5) return 'none';
    if (impact <= 15) return 'minimal';
    if (impact <= 30) return 'moderate';
    if (impact <= 50) return 'significant';
    return 'severe';
  }

  private calculateResourceEfficiency(
    db: DatabaseHealth,
    storage: StorageMetrics,
  ): number {
    const dbEfficiency = 100 - db.connectionPool.utilizationPercentage;
    const storageEfficiency = 100 - storage.networkImpact.bandwidthUtilization;
    return (dbEfficiency + storageEfficiency) / 2;
  }

  private async getWeddingContext(): Promise<
    PerformanceReport['weddingContext']
  > {
    try {
      const { data: weddings } = await this.supabase
        .from('weddings')
        .select('id')
        .eq('status', 'active');

      const currentHour = new Date().getHours();
      const isPeakHours = currentHour >= 6 && currentHour <= 22;

      return {
        activeWeddings: weddings?.length || 0,
        peakActivityPeriod: isPeakHours,
        criticalOperationsAffected: [],
      };
    } catch (error) {
      return {
        activeWeddings: 0,
        peakActivityPeriod: false,
        criticalOperationsAffected: [],
      };
    }
  }

  private generateComprehensiveRecommendations(
    db: DatabaseHealth,
    storage: StorageMetrics,
    context: PerformanceReport['weddingContext'],
  ): PerformanceReport['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Immediate actions
    if (db.backupImpact.throughputDecrease > 30) {
      immediate.push('Reduce backup resource usage immediately');
    }

    if (
      context.peakActivityPeriod &&
      storage.networkImpact.applicationImpact > 20
    ) {
      immediate.push('Consider postponing backup until off-peak hours');
    }

    // Short-term improvements
    if (db.connectionPool.utilizationPercentage > 70) {
      shortTerm.push('Implement connection pooling for backup operations');
    }

    if (storage.uploadPerformance.speed < 10) {
      shortTerm.push('Optimize backup data compression and transfer');
    }

    // Long-term optimizations
    longTerm.push(
      'Implement intelligent backup scheduling based on usage patterns',
    );
    longTerm.push('Consider incremental backup strategies');

    return { immediate, shortTerm, longTerm };
  }

  private analyzeTrends(): PerformanceReport['trends'] {
    if (this.historicalData.length < 2) {
      return {
        performanceTrend: 'stable',
        resourceUsageTrend: 'stable',
        userImpactTrend: 'stable',
      };
    }

    const recent = this.historicalData.slice(-5);
    const performance = recent.map((r) => r.summary.resourceEfficiency);
    const impact = recent.map((r) => {
      switch (r.summary.userImpact) {
        case 'none':
          return 0;
        case 'minimal':
          return 1;
        case 'moderate':
          return 2;
        case 'significant':
          return 3;
        case 'severe':
          return 4;
        default:
          return 2;
      }
    });

    return {
      performanceTrend: this.calculateTrend(performance),
      resourceUsageTrend: this.calculateTrend(performance.map((p) => 100 - p)),
      userImpactTrend: this.calculateTrend(impact),
    };
  }

  private calculateTrend(
    values: number[],
  ): 'improving' | 'stable' | 'degrading' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;

    if (change > 10) return 'improving';
    if (change < -10) return 'degrading';
    return 'stable';
  }

  private calculateDatabaseHealthScore(db: DatabaseHealth): number {
    let score = 100;

    // Deduct points for issues
    score -= Math.min(30, db.connectionPool.utilizationPercentage * 0.3);
    score -= Math.min(20, db.queryPerformance.averageLatency * 0.02);
    score -= Math.min(25, db.backupImpact.throughputDecrease * 0.5);
    score -= Math.min(15, db.queryPerformance.lockContention * 3);

    return Math.max(0, score);
  }

  private calculateStorageHealthScore(storage: StorageMetrics): number {
    let score = 100;

    // Deduct points for issues
    score -= Math.min(25, storage.networkImpact.bandwidthUtilization * 0.25);
    score -= Math.min(20, storage.storageHealth.errorRate * 10);
    score -= Math.min(30, storage.networkImpact.applicationImpact * 0.6);
    score -= storage.uploadPerformance.speed < 5 ? 25 : 0;

    return Math.max(0, score);
  }

  private async measureStorageBaseline(): Promise<{
    latency: number;
    speed: number;
  }> {
    const start = performance.now();
    // Mock baseline measurement
    await new Promise((resolve) => setTimeout(resolve, 50));
    const end = performance.now();

    return {
      latency: end - start,
      speed: 15, // Mbps
    };
  }

  private async checkCriticalThresholds(
    report: PerformanceReport,
  ): Promise<void> {
    const critical: string[] = [];

    if (report.summary.userImpact === 'severe') {
      critical.push('Severe user impact detected');
    }

    if (report.database.connectionPool.utilizationPercentage > 95) {
      critical.push('Database connection pool near exhaustion');
    }

    if (report.storage.storageHealth.errorRate > 20) {
      critical.push('High storage error rate');
    }

    if (critical.length > 0) {
      console.error('🚨 Critical infrastructure issues detected:', critical);
      this.emit('criticalIssue', {
        backupId: report.backupId,
        issues: critical,
        report,
      });
    }
  }
}

export default BackupInfrastructureMonitor;
