/**
 * WS-342 Real-Time Wedding Collaboration - Data Flow Manager
 * Team C: Integration & System Architecture
 */

import type {
  DataFlow,
  DataFlowStatus,
  DataFlowError,
  OptimizationResult,
  OptimizationRecommendation,
} from './types/integration';

import { createSupabaseClient } from '@/lib/supabase';

export class DataFlowManager {
  private supabase = createSupabaseClient();
  private activeFlows: Map<string, DataFlow> = new Map();
  private flowMetrics: Map<string, FlowMetrics> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Register a data flow for monitoring
   */
  registerDataFlow(dataFlow: DataFlow): void {
    this.activeFlows.set(dataFlow.id, dataFlow);
    this.flowMetrics.set(dataFlow.id, {
      flowId: dataFlow.id,
      totalRecords: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageLatency: 0,
      lastError: null,
      uptime: 100,
    });
  }

  /**
   * Get status of all data flows
   */
  getDataFlowStatuses(): DataFlowStatus[] {
    const statuses: DataFlowStatus[] = [];

    for (const [flowId, flow] of this.activeFlows) {
      const metrics = this.flowMetrics.get(flowId);

      if (!metrics) continue;

      const status: DataFlowStatus = {
        flowId,
        status: this.determineFlowHealth(metrics),
        lastSync: flow.lastSync,
        recordsProcessed: metrics.totalRecords,
        errors: this.getRecentErrors(flowId),
      };

      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Optimize data routing for better performance
   */
  async optimizeRouting(): Promise<OptimizationResult> {
    const recommendations: OptimizationRecommendation[] = [];
    let optimizedFlows = 0;
    let totalPerformanceGain = 0;

    // Analyze each active flow
    for (const [flowId, flow] of this.activeFlows) {
      const metrics = this.flowMetrics.get(flowId);
      if (!metrics) continue;

      // Check for optimization opportunities
      const flowRecommendations = await this.analyzeFlow(flow, metrics);
      recommendations.push(...flowRecommendations);

      // Apply automatic optimizations
      const appliedOptimizations = await this.applyAutoOptimizations(
        flow,
        flowRecommendations,
      );
      if (appliedOptimizations.length > 0) {
        optimizedFlows++;
        totalPerformanceGain +=
          this.calculatePerformanceGain(appliedOptimizations);
      }
    }

    // Log optimization results
    await this.logOptimizationResults({
      optimizedFlows,
      performanceGain: totalPerformanceGain,
      recommendedChanges: recommendations,
    });

    return {
      optimizedFlows,
      performanceGain: totalPerformanceGain,
      recommendedChanges: recommendations,
    };
  }

  /**
   * Update flow metrics
   */
  updateFlowMetrics(
    flowId: string,
    recordsProcessed: number,
    success: boolean,
    latency: number,
    error?: string,
  ): void {
    const metrics = this.flowMetrics.get(flowId);
    if (!metrics) return;

    // Update metrics
    metrics.totalRecords += recordsProcessed;

    if (success) {
      metrics.successfulSyncs++;
    } else {
      metrics.failedSyncs++;
      if (error) {
        metrics.lastError = {
          timestamp: new Date(),
          error,
          severity: 'medium',
          resolved: false,
        };
      }
    }

    // Update average latency
    const totalSyncs = metrics.successfulSyncs + metrics.failedSyncs;
    if (totalSyncs > 0) {
      metrics.averageLatency =
        (metrics.averageLatency * (totalSyncs - 1) + latency) / totalSyncs;
    }

    // Update uptime
    metrics.uptime = (metrics.successfulSyncs / Math.max(totalSyncs, 1)) * 100;
  }

  /**
   * Pause a data flow
   */
  async pauseDataFlow(flowId: string): Promise<void> {
    const flow = this.activeFlows.get(flowId);
    if (flow) {
      flow.status = 'paused';

      await this.supabase
        .from('integration_data_flows')
        .update({ status: 'paused' })
        .eq('id', flowId);
    }
  }

  /**
   * Resume a data flow
   */
  async resumeDataFlow(flowId: string): Promise<void> {
    const flow = this.activeFlows.get(flowId);
    if (flow) {
      flow.status = 'active';

      await this.supabase
        .from('integration_data_flows')
        .update({ status: 'active' })
        .eq('id', flowId);
    }
  }

  /**
   * Remove a data flow
   */
  async removeDataFlow(flowId: string): Promise<void> {
    this.activeFlows.delete(flowId);
    this.flowMetrics.delete(flowId);

    await this.supabase
      .from('integration_data_flows')
      .delete()
      .eq('id', flowId);
  }

  // Private helper methods

  private startMonitoring(): void {
    // Monitor flows every 5 minutes
    this.monitoringInterval = setInterval(
      () => {
        this.monitorFlows();
      },
      5 * 60 * 1000,
    );
  }

  private async monitorFlows(): Promise<void> {
    for (const [flowId, flow] of this.activeFlows) {
      if (flow.status !== 'active') continue;

      try {
        // Check if flow needs to sync based on frequency
        const timeSinceLastSync = Date.now() - flow.lastSync.getTime();
        const syncIntervalMs = flow.syncFrequency * 60 * 1000;

        if (timeSinceLastSync >= syncIntervalMs) {
          await this.triggerFlowSync(flowId);
        }

        // Check flow health
        await this.checkFlowHealth(flowId);
      } catch (error) {
        console.error(`Error monitoring flow ${flowId}:`, error);

        this.updateFlowMetrics(
          flowId,
          0,
          false,
          0,
          error instanceof Error ? error.message : 'Monitoring error',
        );
      }
    }
  }

  private async triggerFlowSync(flowId: string): Promise<void> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    const startTime = Date.now();

    try {
      // TODO: Implement actual sync logic with source and target systems
      // This would involve:
      // 1. Fetching data from source system
      // 2. Transforming data according to mapping rules
      // 3. Pushing data to target system

      // Simulate sync operation
      await new Promise((resolve) => setTimeout(resolve, 100));
      const recordsProcessed = Math.floor(Math.random() * 10) + 1;

      // Update flow last sync time
      flow.lastSync = new Date();

      // Update metrics
      this.updateFlowMetrics(
        flowId,
        recordsProcessed,
        true,
        Date.now() - startTime,
      );

      console.log(
        `Flow ${flowId} synced successfully: ${recordsProcessed} records`,
      );
    } catch (error) {
      this.updateFlowMetrics(
        flowId,
        0,
        false,
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Sync failed',
      );

      // Mark flow as error if too many failures
      const metrics = this.flowMetrics.get(flowId);
      if (metrics && metrics.uptime < 50) {
        flow.status = 'error';
      }
    }
  }

  private async checkFlowHealth(flowId: string): Promise<void> {
    const flow = this.activeFlows.get(flowId);
    const metrics = this.flowMetrics.get(flowId);

    if (!flow || !metrics) return;

    // Check various health indicators
    const healthIssues: string[] = [];

    // Check uptime
    if (metrics.uptime < 95) {
      healthIssues.push(`Low uptime: ${metrics.uptime.toFixed(1)}%`);
    }

    // Check latency
    if (metrics.averageLatency > 5000) {
      // 5 seconds
      healthIssues.push(`High latency: ${metrics.averageLatency}ms`);
    }

    // Check recent errors
    const recentErrors = this.getRecentErrors(flowId);
    if (recentErrors.length > 5) {
      healthIssues.push(
        `High error rate: ${recentErrors.length} recent errors`,
      );
    }

    // Update flow status based on health
    if (healthIssues.length > 0) {
      flow.status = 'error';

      await this.supabase.from('integration_flow_health').upsert({
        flow_id: flowId,
        status: 'unhealthy',
        issues: healthIssues,
        checked_at: new Date(),
      });
    }
  }

  private determineFlowHealth(
    metrics: FlowMetrics,
  ): 'healthy' | 'warning' | 'error' {
    if (metrics.uptime >= 95 && metrics.averageLatency < 2000) {
      return 'healthy';
    } else if (metrics.uptime >= 80 && metrics.averageLatency < 5000) {
      return 'warning';
    } else {
      return 'error';
    }
  }

  private getRecentErrors(flowId: string): DataFlowError[] {
    // Return errors from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const metrics = this.flowMetrics.get(flowId);

    if (!metrics?.lastError) return [];

    if (metrics.lastError.timestamp > oneDayAgo) {
      return [metrics.lastError];
    }

    return [];
  }

  private async analyzeFlow(
    flow: DataFlow,
    metrics: FlowMetrics,
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze sync frequency
    if (metrics.averageLatency < 500 && flow.syncFrequency > 5) {
      recommendations.push({
        type: 'frequency_adjustment',
        description: `Increase sync frequency from ${flow.syncFrequency} to ${Math.max(1, flow.syncFrequency - 2)} minutes`,
        impact: 'medium',
      });
    } else if (metrics.averageLatency > 3000 && flow.syncFrequency < 30) {
      recommendations.push({
        type: 'frequency_adjustment',
        description: `Decrease sync frequency from ${flow.syncFrequency} to ${flow.syncFrequency + 5} minutes`,
        impact: 'high',
      });
    }

    // Analyze mapping efficiency
    if (flow.mapping.length > 10) {
      recommendations.push({
        type: 'mapping_optimization',
        description:
          'Consider consolidating mapping rules for better performance',
        impact: 'medium',
      });
    }

    // Analyze routing efficiency
    if (metrics.failedSyncs > metrics.successfulSyncs * 0.1) {
      recommendations.push({
        type: 'route_change',
        description: 'High failure rate detected, consider alternative routing',
        impact: 'high',
      });
    }

    return recommendations;
  }

  private async applyAutoOptimizations(
    flow: DataFlow,
    recommendations: OptimizationRecommendation[],
  ): Promise<OptimizationRecommendation[]> {
    const appliedOptimizations: OptimizationRecommendation[] = [];

    for (const recommendation of recommendations) {
      if (
        recommendation.impact === 'low' ||
        recommendation.type === 'frequency_adjustment'
      ) {
        try {
          await this.applyOptimization(flow, recommendation);
          appliedOptimizations.push(recommendation);
        } catch (error) {
          console.error('Failed to apply optimization:', error);
        }
      }
    }

    return appliedOptimizations;
  }

  private async applyOptimization(
    flow: DataFlow,
    recommendation: OptimizationRecommendation,
  ): Promise<void> {
    switch (recommendation.type) {
      case 'frequency_adjustment':
        const newFrequency = this.extractFrequencyFromRecommendation(
          recommendation.description,
        );
        if (newFrequency) {
          flow.syncFrequency = newFrequency;

          await this.supabase
            .from('integration_data_flows')
            .update({ sync_frequency: newFrequency })
            .eq('id', flow.id);
        }
        break;

      case 'mapping_optimization':
        // TODO: Implement mapping optimization
        break;

      case 'route_change':
        // TODO: Implement route optimization
        break;
    }
  }

  private extractFrequencyFromRecommendation(
    description: string,
  ): number | null {
    const match = description.match(/to (\d+) minutes/);
    return match ? parseInt(match[1], 10) : null;
  }

  private calculatePerformanceGain(
    optimizations: OptimizationRecommendation[],
  ): number {
    let totalGain = 0;

    for (const optimization of optimizations) {
      switch (optimization.impact) {
        case 'low':
          totalGain += 5;
          break;
        case 'medium':
          totalGain += 15;
          break;
        case 'high':
          totalGain += 30;
          break;
      }
    }

    return totalGain;
  }

  private async logOptimizationResults(
    result: OptimizationResult,
  ): Promise<void> {
    await this.supabase.from('integration_optimizations').insert({
      optimized_flows: result.optimizedFlows,
      performance_gain: result.performanceGain,
      recommendations: result.recommendedChanges,
      executed_at: new Date(),
    });
  }

  /**
   * Cleanup monitoring when done
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Supporting interfaces
interface FlowMetrics {
  flowId: string;
  totalRecords: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageLatency: number;
  lastError: DataFlowError | null;
  uptime: number; // percentage
}
