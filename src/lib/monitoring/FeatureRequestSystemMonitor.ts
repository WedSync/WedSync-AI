/**
 * Feature Request System Monitor
 * Comprehensive monitoring for WS-237 Feature Request Management System
 * Includes wedding industry specific monitoring and performance tracking
 */

import { WebSocketManager } from '@/lib/realtime/WebSocketManager';
import { FeatureRequestEventHub } from '@/lib/realtime/FeatureRequestEventHub';

export interface PerformanceMetrics {
  userContextEnrichment: {
    averageTime: number; // ms
    p95Time: number; // ms
    successRate: number; // 0-1
    cacheHitRate: number; // 0-1
  };
  eventProcessing: {
    averageTime: number; // ms
    p95Time: number; // ms
    queueLength: number;
    throughput: number; // events/sec
  };
  database: {
    connectionCount: number;
    averageQueryTime: number; // ms
    slowQueries: number;
    deadlocks: number;
  };
}

export interface WeddingIndustryMetrics {
  activeWeddings: number; // Weddings happening today
  saturdayProtectionActive: boolean; // Wedding day protection mode
  urgentRequests: number; // Critical wedding-related requests
  averageResponseTime: number; // Response time for wedding-day issues
}

export interface SystemHealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  performance: PerformanceMetrics;
  weddingIndustry: WeddingIndustryMetrics;
  recommendations: string[];
  timestamp: string;
}

export class FeatureRequestSystemMonitor {
  private wsManager: WebSocketManager | null = null;
  private eventHub: FeatureRequestEventHub | null = null;
  private metricsBuffer: any[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize monitoring components
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    try {
      // Initialize WebSocket manager for real-time monitoring
      if (typeof window !== 'undefined') {
        // Client-side initialization
        this.wsManager = new WebSocketManager({
          url:
            process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
            'ws://localhost:3001/monitoring',
        });
      }

      // Initialize event hub
      this.eventHub = new FeatureRequestEventHub(
        process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001/events',
      );

      // Start periodic health checks
      this.startHealthChecks();
    } catch (error) {
      console.error('Failed to setup monitoring:', error);
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealthReport> {
    const timestamp = new Date().toISOString();

    try {
      // Gather performance metrics
      const performance = await this.gatherPerformanceMetrics();

      // Gather wedding industry specific metrics
      const weddingIndustry = await this.gatherWeddingIndustryMetrics();

      // Analyze overall health
      const overall = this.analyzeOverallHealth(performance, weddingIndustry);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        performance,
        weddingIndustry,
      );

      const report: SystemHealthReport = {
        overall,
        performance,
        weddingIndustry,
        recommendations,
        timestamp,
      };

      // Publish health check event
      if (this.eventHub) {
        await this.eventHub.publishEvent({
          type: 'feature_request_status_changed',
          requestId: 'system-health',
          userId: 'system',
          data: { healthReport: report },
          timestamp,
        });
      }

      return report;
    } catch (error) {
      console.error('Health check failed:', error);

      return {
        overall: 'critical',
        performance: this.getDefaultPerformanceMetrics(),
        weddingIndustry: this.getDefaultWeddingMetrics(),
        recommendations: [
          'System health check failed - investigate immediately',
        ],
        timestamp,
      };
    }
  }

  /**
   * Gather performance metrics
   */
  private async gatherPerformanceMetrics(): Promise<PerformanceMetrics> {
    // In a real implementation, these would come from actual monitoring systems
    return {
      userContextEnrichment: {
        averageTime: 45, // ms
        p95Time: 120, // ms
        successRate: 0.998,
        cacheHitRate: 0.85,
      },
      eventProcessing: {
        averageTime: 25, // ms
        p95Time: 80, // ms
        queueLength: 12,
        throughput: 156, // events/sec
      },
      database: {
        connectionCount: 45,
        averageQueryTime: 15, // ms
        slowQueries: 2,
        deadlocks: 0,
      },
    };
  }

  /**
   * Gather wedding industry specific metrics
   */
  private async gatherWeddingIndustryMetrics(): Promise<WeddingIndustryMetrics> {
    const today = new Date();
    const isSaturday = today.getDay() === 6; // Saturday = wedding day

    // In a real implementation, these would come from the database
    return {
      activeWeddings: isSaturday ? 23 : 0, // Simulated active weddings
      saturdayProtectionActive: isSaturday,
      urgentRequests: isSaturday ? 8 : 1,
      averageResponseTime: isSaturday ? 1.2 : 5.8, // minutes
    };
  }

  /**
   * Analyze overall system health
   */
  private analyzeOverallHealth(
    performance: PerformanceMetrics,
    weddingIndustry: WeddingIndustryMetrics,
  ): 'healthy' | 'warning' | 'critical' {
    const issues: string[] = [];

    // Check performance thresholds
    if (performance.userContextEnrichment.averageTime > 100) {
      issues.push('User context enrichment too slow');
    }

    if (performance.database.slowQueries > 10) {
      issues.push('Too many slow database queries');
    }

    if (performance.database.deadlocks > 0) {
      issues.push('Database deadlocks detected');
    }

    // Check wedding industry specific issues
    if (
      weddingIndustry.activeWeddings > 0 &&
      weddingIndustry.averageResponseTime > 2
    ) {
      issues.push('Slow response time during active weddings');
    }

    if (weddingIndustry.urgentRequests > 10) {
      issues.push('Too many urgent requests');
    }

    // Determine overall health
    if (issues.length === 0) {
      return 'healthy';
    } else if (
      issues.length <= 2 &&
      !weddingIndustry.saturdayProtectionActive
    ) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  /**
   * Generate health recommendations
   */
  private generateRecommendations(
    performance: PerformanceMetrics,
    weddingIndustry: WeddingIndustryMetrics,
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (performance.userContextEnrichment.cacheHitRate < 0.8) {
      recommendations.push('Increase cache size for user context enrichment');
    }

    if (performance.eventProcessing.queueLength > 100) {
      recommendations.push('Scale event processing workers');
    }

    if (performance.database.connectionCount > 80) {
      recommendations.push('Monitor database connection pool usage');
    }

    // Wedding industry recommendations
    if (weddingIndustry.activeWeddings > 0) {
      recommendations.push(
        'Enable wedding day mode - prioritize critical requests',
      );
      recommendations.push('Ensure 24/7 support team is available');

      if (weddingIndustry.averageResponseTime > 1) {
        recommendations.push(
          'Escalate wedding day issues to senior team immediately',
        );
      }
    }

    if (weddingIndustry.urgentRequests > 5) {
      recommendations.push(
        'Review urgent request criteria - may be over-flagging',
      );
    }

    // Default recommendation if system is healthy
    if (recommendations.length === 0) {
      recommendations.push('System is performing well - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Run health checks every 5 minutes
    this.healthCheckInterval = setInterval(
      async () => {
        await this.performHealthCheck();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.wsManager) {
      this.wsManager.disconnect();
    }

    if (this.eventHub) {
      this.eventHub.disconnect();
    }
  }

  /**
   * Get default performance metrics (fallback)
   */
  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      userContextEnrichment: {
        averageTime: 0,
        p95Time: 0,
        successRate: 0,
        cacheHitRate: 0,
      },
      eventProcessing: {
        averageTime: 0,
        p95Time: 0,
        queueLength: 0,
        throughput: 0,
      },
      database: {
        connectionCount: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        deadlocks: 0,
      },
    };
  }

  /**
   * Get default wedding metrics (fallback)
   */
  private getDefaultWeddingMetrics(): WeddingIndustryMetrics {
    return {
      activeWeddings: 0,
      saturdayProtectionActive: false,
      urgentRequests: 0,
      averageResponseTime: 0,
    };
  }
}

// Export singleton instance
export const featureRequestMonitor = new FeatureRequestSystemMonitor();
