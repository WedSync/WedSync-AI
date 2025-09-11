/**
 * System Metrics Collection
 * Tracks CPU, memory, disk I/O, network, and process health metrics
 * FEATURE: WS-104 - Performance Monitoring Backend Infrastructure
 */

import { metrics } from './metrics';
import { logger } from './structured-logger';
import { alertManager } from './alerts';

export interface SystemResourceMetrics {
  cpu: {
    usage: number; // Percentage
    loadAverage: {
      oneMinute: number;
      fiveMinute: number;
      fifteenMinute: number;
    };
    cores: number;
  };
  memory: {
    total: number; // Bytes
    used: number;
    free: number;
    available: number;
    usagePercentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number; // Resident Set Size
  };
  disk: {
    usage: Array<{
      mount: string;
      total: number;
      used: number;
      free: number;
      usagePercentage: number;
    }>;
    io: {
      reads: number;
      writes: number;
      readBytes: number;
      writeBytes: number;
    };
  };
  network: {
    connections: {
      established: number;
      listening: number;
      timeWait: number;
    };
    traffic: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
    };
  };
  process: {
    pid: number;
    uptime: number;
    eventLoopLag: number;
    activeHandles: number;
    activeRequests: number;
    gcStats?: {
      runs: number;
      totalDuration: number;
      averageDuration: number;
    };
  };
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
  issues: Array<{
    type: 'cpu' | 'memory' | 'disk' | 'network' | 'process';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    value: number;
    threshold: number;
  }>;
  metrics: SystemResourceMetrics;
}

class SystemMetricsCollector {
  private collectionInterval: NodeJS.Timeout | null = null;
  private collectionFrequency = 30000; // 30 seconds
  private lastMetrics: SystemResourceMetrics | null = null;
  private previousCpuUsage: { user: number; system: number } | null = null;
  private gcStats = { runs: 0, totalDuration: 0 };

  // Health thresholds
  private readonly healthThresholds = {
    cpu: {
      warning: 70,
      critical: 90,
    },
    memory: {
      warning: 80,
      critical: 95,
    },
    disk: {
      warning: 85,
      critical: 95,
    },
    eventLoopLag: {
      warning: 100, // 100ms
      critical: 1000, // 1 second
    },
  };

  constructor() {
    this.setupGCMonitoring();
  }

  // Start collecting system metrics
  startCollection(): void {
    if (this.collectionInterval) {
      logger.warn('System metrics collection already started');
      return;
    }

    logger.info('Starting system metrics collection', {
      frequency: this.collectionFrequency,
    });

    // Collect initial metrics
    this.collectMetrics();

    // Set up periodic collection
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.collectionFrequency);

    // Set up process event listeners
    this.setupProcessMonitoring();
  }

  // Stop collecting metrics
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.info('System metrics collection stopped');
    }
  }

  // Collect and record all system metrics
  async collectMetrics(): Promise<SystemResourceMetrics> {
    try {
      const metrics = await this.gatherSystemMetrics();
      this.recordMetrics(metrics);
      this.assessSystemHealth(metrics);
      this.lastMetrics = metrics;
      return metrics;
    } catch (error) {
      logger.error('Failed to collect system metrics', error as Error);
      throw error;
    }
  }

  // Get current system health status
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const currentMetrics = await this.collectMetrics();
    const issues: SystemHealthStatus['issues'] = [];

    // Check CPU health
    if (currentMetrics.cpu.usage > this.healthThresholds.cpu.critical) {
      issues.push({
        type: 'cpu',
        severity: 'critical',
        message: 'Critical CPU usage detected',
        value: currentMetrics.cpu.usage,
        threshold: this.healthThresholds.cpu.critical,
      });
    } else if (currentMetrics.cpu.usage > this.healthThresholds.cpu.warning) {
      issues.push({
        type: 'cpu',
        severity: 'high',
        message: 'High CPU usage detected',
        value: currentMetrics.cpu.usage,
        threshold: this.healthThresholds.cpu.warning,
      });
    }

    // Check memory health
    if (
      currentMetrics.memory.usagePercentage >
      this.healthThresholds.memory.critical
    ) {
      issues.push({
        type: 'memory',
        severity: 'critical',
        message: 'Critical memory usage detected',
        value: currentMetrics.memory.usagePercentage,
        threshold: this.healthThresholds.memory.critical,
      });
    } else if (
      currentMetrics.memory.usagePercentage >
      this.healthThresholds.memory.warning
    ) {
      issues.push({
        type: 'memory',
        severity: 'high',
        message: 'High memory usage detected',
        value: currentMetrics.memory.usagePercentage,
        threshold: this.healthThresholds.memory.warning,
      });
    }

    // Check disk health
    currentMetrics.disk.usage.forEach((disk) => {
      if (disk.usagePercentage > this.healthThresholds.disk.critical) {
        issues.push({
          type: 'disk',
          severity: 'critical',
          message: `Critical disk usage on ${disk.mount}`,
          value: disk.usagePercentage,
          threshold: this.healthThresholds.disk.critical,
        });
      } else if (disk.usagePercentage > this.healthThresholds.disk.warning) {
        issues.push({
          type: 'disk',
          severity: 'high',
          message: `High disk usage on ${disk.mount}`,
          value: disk.usagePercentage,
          threshold: this.healthThresholds.disk.warning,
        });
      }
    });

    // Check event loop lag
    if (
      currentMetrics.process.eventLoopLag >
      this.healthThresholds.eventLoopLag.critical
    ) {
      issues.push({
        type: 'process',
        severity: 'critical',
        message: 'Critical event loop lag detected',
        value: currentMetrics.process.eventLoopLag,
        threshold: this.healthThresholds.eventLoopLag.critical,
      });
    } else if (
      currentMetrics.process.eventLoopLag >
      this.healthThresholds.eventLoopLag.warning
    ) {
      issues.push({
        type: 'process',
        severity: 'medium',
        message: 'High event loop lag detected',
        value: currentMetrics.process.eventLoopLag,
        threshold: this.healthThresholds.eventLoopLag.warning,
      });
    }

    // Determine overall health status
    let status: SystemHealthStatus['status'] = 'healthy';
    if (issues.some((issue) => issue.severity === 'critical')) {
      status = 'critical';
    } else if (issues.some((issue) => issue.severity === 'high')) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: Date.now(),
      issues,
      metrics: currentMetrics,
    };
  }

  // Get the latest collected metrics
  getLatestMetrics(): SystemResourceMetrics | null {
    return this.lastMetrics;
  }

  // Private methods for collecting specific metrics
  private async gatherSystemMetrics(): Promise<SystemResourceMetrics> {
    const [cpu, memory, disk, network, process] = await Promise.all([
      this.getCpuMetrics(),
      this.getMemoryMetrics(),
      this.getDiskMetrics(),
      this.getNetworkMetrics(),
      this.getProcessMetrics(),
    ]);

    return {
      cpu,
      memory,
      disk,
      network,
      process,
    };
  }

  private async getCpuMetrics(): Promise<SystemResourceMetrics['cpu']> {
    let cpuUsage = 0;
    let cores = 1;
    let loadAverage = { oneMinute: 0, fiveMinute: 0, fifteenMinute: 0 };

    if (typeof process !== 'undefined') {
      // Get CPU usage
      if (process.cpuUsage) {
        const currentUsage = process.cpuUsage();
        if (this.previousCpuUsage) {
          const userDiff = currentUsage.user - this.previousCpuUsage.user;
          const systemDiff = currentUsage.system - this.previousCpuUsage.system;
          const totalDiff = userDiff + systemDiff;

          // Convert microseconds to percentage (rough approximation)
          cpuUsage = Math.min(
            100,
            (totalDiff / (this.collectionFrequency * 1000)) * 100,
          );
        }
        this.previousCpuUsage = currentUsage;
      }

      // Get number of CPU cores
      const os = await this.getOSModule();
      if (os && os.cpus) {
        cores = os.cpus().length;
      }

      // Get load average
      if (os && os.loadavg) {
        const load = os.loadavg();
        loadAverage = {
          oneMinute: load[0] || 0,
          fiveMinute: load[1] || 0,
          fifteenMinute: load[2] || 0,
        };
      }
    }

    return {
      usage: cpuUsage,
      loadAverage,
      cores,
    };
  }

  private async getMemoryMetrics(): Promise<SystemResourceMetrics['memory']> {
    let systemMemory = {
      total: 0,
      used: 0,
      free: 0,
      available: 0,
      usagePercentage: 0,
    };

    let processMemory = {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };

    if (typeof process !== 'undefined') {
      // Get process memory usage
      if (process.memoryUsage) {
        const memUsage = process.memoryUsage();
        processMemory = {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        };
      }

      // Get system memory info
      const os = await this.getOSModule();
      if (os && os.totalmem && os.freemem) {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;

        systemMemory = {
          total,
          used,
          free,
          available: free,
          usagePercentage: (used / total) * 100,
        };
      }
    }

    return {
      ...systemMemory,
      ...processMemory,
    };
  }

  private async getDiskMetrics(): Promise<SystemResourceMetrics['disk']> {
    // Note: Disk metrics would require platform-specific implementations
    // This is a simplified version for demonstration
    return {
      usage: [
        {
          mount: '/',
          total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
          used: 50 * 1024 * 1024 * 1024, // 50GB placeholder
          free: 50 * 1024 * 1024 * 1024, // 50GB placeholder
          usagePercentage: 50,
        },
      ],
      io: {
        reads: 0,
        writes: 0,
        readBytes: 0,
        writeBytes: 0,
      },
    };
  }

  private async getNetworkMetrics(): Promise<SystemResourceMetrics['network']> {
    // Note: Network metrics would require platform-specific implementations
    // This is a simplified version for demonstration
    return {
      connections: {
        established: 0,
        listening: 0,
        timeWait: 0,
      },
      traffic: {
        bytesIn: 0,
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
      },
    };
  }

  private async getProcessMetrics(): Promise<SystemResourceMetrics['process']> {
    let processMetrics = {
      pid: 0,
      uptime: 0,
      eventLoopLag: 0,
      activeHandles: 0,
      activeRequests: 0,
      gcStats: undefined as SystemResourceMetrics['process']['gcStats'],
    };

    if (typeof process !== 'undefined') {
      processMetrics.pid = process.pid;
      processMetrics.uptime = process.uptime() * 1000; // Convert to milliseconds

      // Measure event loop lag
      processMetrics.eventLoopLag = await this.measureEventLoopLag();

      // Get active handles and requests (if available)
      if ((process as any)._getActiveHandles) {
        processMetrics.activeHandles = (
          process as any
        )._getActiveHandles().length;
      }
      if ((process as any)._getActiveRequests) {
        processMetrics.activeRequests = (
          process as any
        )._getActiveRequests().length;
      }

      // Include GC stats if available
      if (this.gcStats.runs > 0) {
        processMetrics.gcStats = {
          runs: this.gcStats.runs,
          totalDuration: this.gcStats.totalDuration,
          averageDuration: this.gcStats.totalDuration / this.gcStats.runs,
        };
      }
    }

    return processMetrics;
  }

  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    });
  }

  private async getOSModule(): Promise<any> {
    try {
      // Dynamically import os module (Node.js only)
      return typeof require !== 'undefined' ? require('os') : null;
    } catch {
      return null;
    }
  }

  private recordMetrics(systemMetrics: SystemResourceMetrics): void {
    // CPU metrics
    metrics.setGauge('system.cpu.usage', systemMetrics.cpu.usage);
    metrics.setGauge('system.cpu.cores', systemMetrics.cpu.cores);
    metrics.setGauge(
      'system.cpu.load_average.1m',
      systemMetrics.cpu.loadAverage.oneMinute,
    );
    metrics.setGauge(
      'system.cpu.load_average.5m',
      systemMetrics.cpu.loadAverage.fiveMinute,
    );
    metrics.setGauge(
      'system.cpu.load_average.15m',
      systemMetrics.cpu.loadAverage.fifteenMinute,
    );

    // Memory metrics
    metrics.setGauge('system.memory.total', systemMetrics.memory.total);
    metrics.setGauge('system.memory.used', systemMetrics.memory.used);
    metrics.setGauge('system.memory.free', systemMetrics.memory.free);
    metrics.setGauge(
      'system.memory.usage_percentage',
      systemMetrics.memory.usagePercentage,
    );
    metrics.setGauge('system.memory.heap_used', systemMetrics.memory.heapUsed);
    metrics.setGauge(
      'system.memory.heap_total',
      systemMetrics.memory.heapTotal,
    );
    metrics.setGauge('system.memory.rss', systemMetrics.memory.rss);

    // Process metrics
    metrics.setGauge('system.process.uptime', systemMetrics.process.uptime);
    metrics.setGauge(
      'system.process.event_loop_lag',
      systemMetrics.process.eventLoopLag,
    );
    metrics.setGauge(
      'system.process.active_handles',
      systemMetrics.process.activeHandles,
    );
    metrics.setGauge(
      'system.process.active_requests',
      systemMetrics.process.activeRequests,
    );

    // GC metrics
    if (systemMetrics.process.gcStats) {
      metrics.setGauge('system.gc.runs', systemMetrics.process.gcStats.runs);
      metrics.setGauge(
        'system.gc.total_duration',
        systemMetrics.process.gcStats.totalDuration,
      );
      metrics.setGauge(
        'system.gc.average_duration',
        systemMetrics.process.gcStats.averageDuration,
      );
    }

    // Disk metrics
    systemMetrics.disk.usage.forEach((disk, index) => {
      const labels = { mount: disk.mount };
      metrics.setGauge('system.disk.total', disk.total, labels);
      metrics.setGauge('system.disk.used', disk.used, labels);
      metrics.setGauge('system.disk.free', disk.free, labels);
      metrics.setGauge(
        'system.disk.usage_percentage',
        disk.usagePercentage,
        labels,
      );
    });

    logger.debug('System metrics recorded', {
      cpuUsage: Math.round(systemMetrics.cpu.usage),
      memoryUsage: Math.round(systemMetrics.memory.usagePercentage),
      eventLoopLag: Math.round(systemMetrics.process.eventLoopLag),
      activeHandles: systemMetrics.process.activeHandles,
    });
  }

  private assessSystemHealth(systemMetrics: SystemResourceMetrics): void {
    // CPU health assessment
    if (systemMetrics.cpu.usage > this.healthThresholds.cpu.critical) {
      this.triggerAlert(
        'critical',
        'cpu',
        'Critical CPU usage detected',
        systemMetrics.cpu.usage,
      );
    } else if (systemMetrics.cpu.usage > this.healthThresholds.cpu.warning) {
      this.triggerAlert(
        'high',
        'cpu',
        'High CPU usage detected',
        systemMetrics.cpu.usage,
      );
    }

    // Memory health assessment
    if (
      systemMetrics.memory.usagePercentage >
      this.healthThresholds.memory.critical
    ) {
      this.triggerAlert(
        'critical',
        'memory',
        'Critical memory usage detected',
        systemMetrics.memory.usagePercentage,
      );
    } else if (
      systemMetrics.memory.usagePercentage >
      this.healthThresholds.memory.warning
    ) {
      this.triggerAlert(
        'high',
        'memory',
        'High memory usage detected',
        systemMetrics.memory.usagePercentage,
      );
    }

    // Event loop lag assessment
    if (
      systemMetrics.process.eventLoopLag >
      this.healthThresholds.eventLoopLag.critical
    ) {
      this.triggerAlert(
        'critical',
        'process',
        'Critical event loop lag detected',
        systemMetrics.process.eventLoopLag,
      );
    } else if (
      systemMetrics.process.eventLoopLag >
      this.healthThresholds.eventLoopLag.warning
    ) {
      this.triggerAlert(
        'medium',
        'process',
        'High event loop lag detected',
        systemMetrics.process.eventLoopLag,
      );
    }
  }

  private triggerAlert(
    severity: string,
    type: string,
    message: string,
    value: number,
  ): void {
    const alertData = {
      type: 'system_health',
      severity,
      message,
      details: {
        metricType: type,
        value,
        timestamp: Date.now(),
      },
    };

    logger.warn('System health alert triggered', alertData);

    metrics.incrementCounter('system.alerts', 1, {
      type,
      severity,
    });

    alertManager.triggerAlert(alertData);
  }

  private setupGCMonitoring(): void {
    if (typeof process !== 'undefined' && process.on) {
      // Monitor garbage collection if available
      try {
        if ((global as any).gc) {
          const originalGC = (global as any).gc;
          (global as any).gc = (...args: any[]) => {
            const start = Date.now();
            const result = originalGC.apply(this, args);
            const duration = Date.now() - start;

            this.gcStats.runs++;
            this.gcStats.totalDuration += duration;

            metrics.recordHistogram('system.gc.duration', duration);

            if (duration > 100) {
              // GC took more than 100ms
              logger.warn('Long garbage collection detected', {
                duration,
                totalRuns: this.gcStats.runs,
              });
            }

            return result;
          };
        }
      } catch (error) {
        // GC monitoring not available or failed to set up
        logger.debug('GC monitoring setup failed', error);
      }
    }
  }

  private setupProcessMonitoring(): void {
    if (typeof process !== 'undefined') {
      // Monitor memory warnings
      process.on('warning', (warning) => {
        logger.warn('Process warning', {
          name: warning.name,
          message: warning.message,
          stack: warning.stack,
        });

        metrics.incrementCounter('system.process.warnings', 1, {
          warning_type: warning.name,
        });
      });

      // Monitor uncaught exceptions and rejections (already handled by APM, but add metrics)
      process.on('uncaughtException', () => {
        metrics.incrementCounter('system.process.uncaught_exceptions', 1);
      });

      process.on('unhandledRejection', () => {
        metrics.incrementCounter('system.process.unhandled_rejections', 1);
      });
    }
  }
}

// Export singleton instance
export const systemMetricsCollector = new SystemMetricsCollector();

// Utility functions
export const startSystemMetricsCollection =
  systemMetricsCollector.startCollection.bind(systemMetricsCollector);
export const stopSystemMetricsCollection =
  systemMetricsCollector.stopCollection.bind(systemMetricsCollector);
export const getSystemHealth = systemMetricsCollector.getSystemHealth.bind(
  systemMetricsCollector,
);
export const getLatestSystemMetrics =
  systemMetricsCollector.getLatestMetrics.bind(systemMetricsCollector);
