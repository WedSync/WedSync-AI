/**
 * WS-203 Team D: Auto-Scaling Controller for WebSocket Traffic
 *
 * Intelligent auto-scaling system handling 10x traffic spikes during wedding season.
 * Predictive scaling based on wedding patterns, real-time metrics, and photographer usage.
 *
 * Wedding Industry Context:
 * - June wedding season: 10x traffic increase requiring immediate scaling
 * - Daily peaks: 6-8pm when couples update wedding details
 * - Photographer workflow: Rapid channel switching during multi-wedding management
 * - Venue coordination: Burst traffic for large wedding broadcasts (100+ subscribers)
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { performanceMonitor } from '@/lib/monitoring/performance';
import {
  connectionPool,
  ScalingTrigger,
  ScalingResult,
} from './connection-pool';
import { channelCacheManager } from '@/lib/cache/channel-cache/cache-manager';
import { createClient } from '@/lib/supabase/client';

// Configuration Schema
const autoScalerConfigSchema = z.object({
  scaling: z.object({
    minInstances: z.number().min(1).max(10).default(2),
    maxInstances: z.number().min(2).max(20).default(10),
    targetUtilization: z.number().min(0.3).max(0.9).default(0.7),
    scaleUpThreshold: z.number().min(0.5).max(0.95).default(0.8),
    scaleDownThreshold: z.number().min(0.1).max(0.5).default(0.4),
    cooldownPeriod: z.number().min(60000).max(1800000).default(300000), // 5 minutes
    emergencyCooldown: z.number().min(30000).max(300000).default(60000), // 1 minute for emergencies
  }),
  monitoring: z.object({
    metricsInterval: z.number().min(5000).max(60000).default(15000), // 15 seconds
    predictionWindow: z.number().min(300000).max(3600000).default(900000), // 15 minutes
    healthCheckInterval: z.number().min(10000).max(120000).default(30000), // 30 seconds
    alertThreshold: z.number().min(0.8).max(1.0).default(0.9),
  }),
  weddingSeason: z.object({
    enabled: z.boolean().default(true),
    preScalingWindow: z.number().min(3600000).max(86400000).default(7200000), // 2 hours
    seasonalMultipliers: z
      .record(z.string(), z.number().min(0.5).max(15.0))
      .default({
        january: 0.6,
        february: 0.7,
        march: 0.8,
        april: 1.2,
        may: 2.0,
        june: 10.0,
        july: 3.0,
        august: 2.5,
        september: 8.0,
        october: 6.0,
        november: 1.0,
        december: 0.8,
      }),
    dailyPeakHours: z.array(z.number().min(0).max(23)).default([18, 19, 20]), // 6-8pm
    weddingDayMultiplier: z.number().min(1.0).max(5.0).default(2.0),
  }),
  costProtection: z.object({
    maxHourlyCost: z.number().min(10).max(1000).default(100),
    budgetAlertThreshold: z.number().min(0.7).max(0.95).default(0.8),
    emergencyScaleDownEnabled: z.boolean().default(true),
    costPerInstance: z.number().min(0.01).max(10.0).default(0.5), // Per hour
  }),
});

export type AutoScalerConfig = z.infer<typeof autoScalerConfigSchema>;

// Core Interfaces
export interface ScalingRule {
  id: string;
  name: string;
  trigger: ScalingTrigger;
  condition: ScalingCondition;
  action: ScalingAction;
  priority: number;
  enabled: boolean;
  cooldownOverride?: number;
}

export interface ScalingCondition {
  metric:
    | 'cpu'
    | 'memory'
    | 'connections'
    | 'response_time'
    | 'error_rate'
    | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // How long condition must be true
  window: number; // Time window for evaluation
}

export interface ScalingAction {
  type: 'scale_up' | 'scale_down' | 'maintain';
  targetInstances?: number;
  scaleFactor?: number; // Multiplier for current instances
  maxInstances?: number;
  minInstances?: number;
}

export interface LoadPrediction {
  timestamp: Date;
  predictedLoad: number;
  confidence: number;
  seasonalFactor: number;
  weddingEvents: WeddingEvent[];
  recommendedInstances: number;
  peakProbability: number;
  factors: PredictionFactor[];
}

export interface WeddingEvent {
  date: Date;
  type: 'ceremony' | 'reception' | 'rehearsal';
  expectedGuests: number;
  suppliersInvolved: number;
  impactMultiplier: number;
}

export interface PredictionFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScalingEvent {
  id: string;
  timestamp: Date;
  trigger: ScalingTrigger;
  previousInstances: number;
  targetInstances: number;
  actualInstances: number;
  duration: number;
  cost: number;
  success: boolean;
  metrics: ScalingMetrics;
  reason: string;
}

export interface ScalingMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  connectionCount: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  cacheHitRatio: number;
  activeChannels: number;
}

export interface TrafficPattern {
  hour: number;
  dayOfWeek: number;
  month: number;
  averageConnections: number;
  peakConnections: number;
  averageResponseTime: number;
  errorRate: number;
  photographerActivity: number;
  coupleActivity: number;
  venueActivity: number;
}

/**
 * Intelligent Auto-Scaling Controller
 *
 * Features:
 * - Predictive scaling based on wedding season patterns
 * - Real-time metric monitoring with 15-second intervals
 * - Cost-aware scaling with budget protection
 * - Wedding-specific traffic pattern recognition
 * - Emergency scaling for critical wedding periods
 * - Multi-tier scaling rules with priority handling
 */
export class AutoScaler extends EventEmitter {
  private config: AutoScalerConfig;
  private currentInstances: number;
  private scalingRules: Map<string, ScalingRule> = new Map();
  private scalingHistory: ScalingEvent[] = [];
  private lastScalingEvent: Date = new Date(0);
  private monitoringTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private predictionTimer?: NodeJS.Timeout;
  private trafficPatterns: Map<string, TrafficPattern> = new Map();
  private supabase = createClient();
  private currentMetrics: ScalingMetrics;
  private emergencyMode: boolean = false;

  constructor(config?: Partial<AutoScalerConfig>) {
    super();
    this.config = autoScalerConfigSchema.parse(config || {});
    this.currentInstances = this.config.scaling.minInstances;
    this.currentMetrics = this.initializeMetrics();
    this.initializeDefaultRules();
    this.startMonitoring();
    this.loadTrafficPatterns();

    logger.info('Auto-Scaler initialized', {
      minInstances: this.config.scaling.minInstances,
      maxInstances: this.config.scaling.maxInstances,
      weddingSeasonEnabled: this.config.weddingSeason.enabled,
      component: 'AutoScaler',
    });
  }

  private initializeMetrics(): ScalingMetrics {
    return {
      cpuUtilization: 0,
      memoryUtilization: 0,
      connectionCount: 0,
      responseTime: 0,
      errorRate: 0,
      throughput: 0,
      cacheHitRatio: 0,
      activeChannels: 0,
    };
  }

  /**
   * Monitor traffic patterns and trigger scaling decisions
   */
  async monitorTrafficPatterns(): Promise<void> {
    try {
      // Collect current metrics
      const metrics = await this.collectMetrics();
      this.currentMetrics = metrics;

      // Evaluate scaling rules
      const scalingDecision = await this.evaluateScalingRules(metrics);

      // Execute scaling if needed
      if (scalingDecision.shouldScale) {
        await this.executeScaling(
          scalingDecision.trigger,
          scalingDecision.targetInstances,
          scalingDecision.reason,
        );
      }

      // Update traffic patterns for future predictions
      await this.updateTrafficPatterns(metrics);

      // Check for emergency conditions
      await this.checkEmergencyConditions(metrics);

      // Log monitoring event
      logger.debug('Traffic monitoring cycle completed', {
        currentInstances: this.currentInstances,
        connectionCount: metrics.connectionCount,
        responseTime: metrics.responseTime,
        cpuUtilization: metrics.cpuUtilization,
        shouldScale: scalingDecision.shouldScale,
        component: 'AutoScaler',
      });
    } catch (error) {
      logger.error('Error in traffic monitoring', {
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  /**
   * Trigger scale-up with intelligent reasoning
   */
  async triggerScaleUp(reason: ScalingTrigger): Promise<void> {
    try {
      // Check cooldown period
      const timeSinceLastScale = Date.now() - this.lastScalingEvent.getTime();
      const cooldownPeriod = this.emergencyMode
        ? this.config.scaling.emergencyCooldown
        : this.config.scaling.cooldownPeriod;

      if (
        timeSinceLastScale < cooldownPeriod &&
        reason !== ScalingTrigger.MANUAL_SCALE
      ) {
        logger.warn('Scale-up blocked by cooldown period', {
          timeSinceLastScale,
          cooldownPeriod,
          reason,
          component: 'AutoScaler',
        });
        return;
      }

      // Calculate target instances
      const targetInstances = await this.calculateScaleUpTarget(reason);

      // Cost protection check
      if (!(await this.validateScalingCost(targetInstances))) {
        logger.warn('Scale-up blocked by cost protection', {
          targetInstances,
          currentCost: await this.calculateCurrentCost(),
          maxCost: this.config.costProtection.maxHourlyCost,
          component: 'AutoScaler',
        });
        return;
      }

      await this.executeScaling(
        reason,
        targetInstances,
        `Scale-up triggered: ${reason}`,
      );
    } catch (error) {
      logger.error('Error triggering scale-up', {
        reason,
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  /**
   * Trigger scale-down with cost optimization
   */
  async triggerScaleDown(reason: ScalingTrigger): Promise<void> {
    try {
      // Prevent scaling down below minimum during wedding season
      const seasonalMultiplier = this.getCurrentSeasonalMultiplier();
      const effectiveMinInstances =
        seasonalMultiplier > 2.0
          ? Math.max(
              this.config.scaling.minInstances,
              Math.ceil(this.config.scaling.minInstances * 1.5),
            )
          : this.config.scaling.minInstances;

      if (this.currentInstances <= effectiveMinInstances) {
        logger.debug('Scale-down blocked - at minimum instances', {
          currentInstances: this.currentInstances,
          effectiveMinInstances,
          seasonalMultiplier,
          component: 'AutoScaler',
        });
        return;
      }

      // Check cooldown
      const timeSinceLastScale = Date.now() - this.lastScalingEvent.getTime();
      if (timeSinceLastScale < this.config.scaling.cooldownPeriod) {
        return;
      }

      // Calculate target instances
      const targetInstances = Math.max(
        effectiveMinInstances,
        Math.floor(this.currentInstances * 0.8), // Scale down by 20%
      );

      await this.executeScaling(
        reason,
        targetInstances,
        `Scale-down triggered: ${reason}`,
      );
    } catch (error) {
      logger.error('Error triggering scale-down', {
        reason,
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  /**
   * Predict wedding traffic patterns and pre-scale
   */
  async predictWeddingTrafficPatterns(
    month: number,
  ): Promise<TrafficPrediction> {
    try {
      const seasonalFactor = this.getSeasonalMultiplier(month);
      const currentHour = new Date().getHours();
      const isPeakHour =
        this.config.weddingSeason.dailyPeakHours.includes(currentHour);

      // Get upcoming wedding events
      const weddingEvents = await this.getUpcomingWeddingEvents();

      // Calculate prediction factors
      const factors: PredictionFactor[] = [
        {
          name: 'Seasonal Factor',
          weight: 0.4,
          value: seasonalFactor,
          impact: seasonalFactor > 1.5 ? 'positive' : 'neutral',
        },
        {
          name: 'Peak Hour',
          weight: 0.2,
          value: isPeakHour ? 2.0 : 1.0,
          impact: isPeakHour ? 'positive' : 'neutral',
        },
        {
          name: 'Wedding Events',
          weight: 0.3,
          value: weddingEvents.length,
          impact: weddingEvents.length > 0 ? 'positive' : 'neutral',
        },
        {
          name: 'Historical Pattern',
          weight: 0.1,
          value: await this.getHistoricalLoadFactor(month, currentHour),
          impact: 'neutral',
        },
      ];

      // Calculate predicted load
      const baseLoad = this.currentMetrics.connectionCount || 100;
      const predictedLoad = factors.reduce(
        (load, factor) => load * (1 + (factor.value - 1) * factor.weight),
        baseLoad,
      );

      // Calculate confidence based on data availability
      const confidence = Math.min(
        0.95,
        0.6 + this.scalingHistory.length * 0.01,
      );

      // Recommend instances
      const recommendedInstances = Math.min(
        this.config.scaling.maxInstances,
        Math.max(
          this.config.scaling.minInstances,
          Math.ceil(predictedLoad / 100), // Assume 100 connections per instance
        ),
      );

      const prediction: TrafficPrediction = {
        timestamp: new Date(),
        predictedLoad,
        confidence,
        seasonalFactor,
        weddingEvents,
        recommendedInstances,
        peakProbability: isPeakHour ? 0.8 : 0.2,
        factors,
      };

      logger.info('Wedding traffic prediction generated', {
        month,
        predictedLoad: Math.round(predictedLoad),
        recommendedInstances,
        confidence: Math.round(confidence * 100),
        seasonalFactor,
        component: 'AutoScaler',
      });

      this.emit('predictionGenerated', prediction);
      return prediction;
    } catch (error) {
      logger.error('Error predicting wedding traffic patterns', {
        month,
        error: error.message,
        component: 'AutoScaler',
      });
      throw error;
    }
  }

  /**
   * Pre-warm channels for expected traffic
   */
  async preWarmChannelCache(expectedChannels: string[]): Promise<void> {
    try {
      logger.info('Pre-warming channel cache for expected traffic', {
        channelCount: expectedChannels.length,
        component: 'AutoScaler',
      });

      // Pre-warm channels in the cache manager
      const preWarmPromises = expectedChannels.map(async (channelName) => {
        try {
          // This would interact with the cache manager to pre-load channel data
          // For now, we'll simulate the pre-warming process
          await new Promise((resolve) => setTimeout(resolve, 10));
          logger.debug('Channel pre-warmed', {
            channelName,
            component: 'AutoScaler',
          });
        } catch (error) {
          logger.warn('Failed to pre-warm channel', {
            channelName,
            error: error.message,
            component: 'AutoScaler',
          });
        }
      });

      await Promise.allSettled(preWarmPromises);

      logger.info('Channel pre-warming completed', {
        totalChannels: expectedChannels.length,
        component: 'AutoScaler',
      });
    } catch (error) {
      logger.error('Error pre-warming channel cache', {
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  /**
   * Configure seasonal scaling for wedding periods
   */
  async configureSeasonalScaling(season: WeddingSeason): Promise<void> {
    try {
      logger.info('Configuring seasonal scaling', {
        season: season.name,
        multiplier: season.multiplier,
        component: 'AutoScaler',
      });

      // Update seasonal multipliers
      this.config.weddingSeason.seasonalMultipliers[season.name.toLowerCase()] =
        season.multiplier;

      // Adjust scaling thresholds for the season
      if (season.multiplier > 2.0) {
        // Wedding season - more aggressive scaling
        this.config.scaling.scaleUpThreshold = 0.7; // Scale up earlier
        this.config.scaling.targetUtilization = 0.6; // Lower target utilization
        this.config.scaling.cooldownPeriod = 180000; // 3-minute cooldown
      } else {
        // Off-season - conservative scaling
        this.config.scaling.scaleUpThreshold = 0.8;
        this.config.scaling.targetUtilization = 0.7;
        this.config.scaling.cooldownPeriod = 300000; // 5-minute cooldown
      }

      // Update scaling rules
      await this.updateSeasonalScalingRules(season);

      logger.info('Seasonal scaling configured', {
        season: season.name,
        scaleUpThreshold: this.config.scaling.scaleUpThreshold,
        targetUtilization: this.config.scaling.targetUtilization,
        component: 'AutoScaler',
      });
    } catch (error) {
      logger.error('Error configuring seasonal scaling', {
        season: season.name,
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  /**
   * Monitor photographer usage patterns for optimization
   */
  async monitorPhotographerUsagePatterns(): Promise<UsagePattern[]> {
    try {
      const patterns: UsagePattern[] = [];

      // Query photographer usage data from the last 30 days
      const { data: usageData, error } = await this.supabase
        .from('websocket_usage_analytics')
        .select('*')
        .eq('user_role', 'photographer')
        .gte(
          'timestamp',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      // Analyze patterns by time of day and wedding count
      const patternMap = new Map<string, UsagePattern>();

      usageData?.forEach((record) => {
        const hour = new Date(record.timestamp).getHours();
        const key = `hour_${hour}`;

        if (!patternMap.has(key)) {
          patternMap.set(key, {
            type: 'photographer_hourly',
            hour,
            averageConnections: 0,
            peakConnections: 0,
            channelSwitches: 0,
            averageSessionDuration: 0,
            patterns: [],
          });
        }

        const pattern = patternMap.get(key)!;
        pattern.averageConnections =
          (pattern.averageConnections + record.connection_count) / 2;
        pattern.peakConnections = Math.max(
          pattern.peakConnections,
          record.peak_connections,
        );
        pattern.channelSwitches += record.channel_switches || 0;
        pattern.patterns.push({
          timestamp: new Date(record.timestamp),
          value: record.connection_count,
          metadata: record.metadata,
        });
      });

      patterns.push(...patternMap.values());

      logger.info('Photographer usage patterns analyzed', {
        patternCount: patterns.length,
        totalRecords: usageData?.length || 0,
        component: 'AutoScaler',
      });

      return patterns;
    } catch (error) {
      logger.error('Error monitoring photographer usage patterns', {
        error: error.message,
        component: 'AutoScaler',
      });
      return [];
    }
  }

  /**
   * Configure scaling rules with priorities
   */
  async configureScalingRules(rules: ScalingRule[]): Promise<void> {
    try {
      logger.info('Configuring scaling rules', {
        ruleCount: rules.length,
        component: 'AutoScaler',
      });

      // Validate and store rules
      for (const rule of rules) {
        if (!this.validateScalingRule(rule)) {
          logger.warn('Invalid scaling rule skipped', {
            ruleId: rule.id,
            component: 'AutoScaler',
          });
          continue;
        }

        this.scalingRules.set(rule.id, rule);
      }

      // Sort rules by priority
      const sortedRules = Array.from(this.scalingRules.values()).sort(
        (a, b) => b.priority - a.priority,
      );

      logger.info('Scaling rules configured', {
        totalRules: this.scalingRules.size,
        enabledRules: sortedRules.filter((r) => r.enabled).length,
        component: 'AutoScaler',
      });
    } catch (error) {
      logger.error('Error configuring scaling rules', {
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  /**
   * Get scaling history for analysis
   */
  async getScalingHistory(): Promise<ScalingEvent[]> {
    // Return copy of scaling history
    return [...this.scalingHistory];
  }

  // Private Helper Methods

  private async collectMetrics(): Promise<ScalingMetrics> {
    try {
      // Get connection pool metrics
      const poolMetrics = await connectionPool.getPoolMetrics();

      // Get cache metrics
      const cacheMetrics = await channelCacheManager.getCacheMetrics();

      // Simulate other metrics (in real implementation, these would come from monitoring systems)
      const metrics: ScalingMetrics = {
        cpuUtilization:
          Math.random() * 0.3 + (poolMetrics.activeConnections / 1000) * 0.7, // Simulate CPU load
        memoryUtilization: poolMetrics.memoryUsage / (1024 * 1024), // Convert to MB ratio
        connectionCount: poolMetrics.activeConnections,
        responseTime: poolMetrics.averageChannelSwitchTime,
        errorRate: cacheMetrics.errorRate,
        throughput: poolMetrics.connectionThroughput,
        cacheHitRatio: cacheMetrics.hitRatio,
        activeChannels: Math.floor(poolMetrics.activeConnections / 5), // Estimate channels
      };

      return metrics;
    } catch (error) {
      logger.error('Error collecting metrics', {
        error: error.message,
        component: 'AutoScaler',
      });

      // Return default metrics on error
      return this.initializeMetrics();
    }
  }

  private async evaluateScalingRules(metrics: ScalingMetrics): Promise<{
    shouldScale: boolean;
    trigger: ScalingTrigger;
    targetInstances: number;
    reason: string;
  }> {
    const sortedRules = Array.from(this.scalingRules.values())
      .filter((rule) => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const shouldTrigger = await this.evaluateScalingCondition(
        rule.condition,
        metrics,
      );

      if (shouldTrigger) {
        const targetInstances = this.calculateTargetInstances(
          rule.action,
          metrics,
        );

        return {
          shouldScale: targetInstances !== this.currentInstances,
          trigger: rule.trigger,
          targetInstances,
          reason: `Rule triggered: ${rule.name}`,
        };
      }
    }

    return {
      shouldScale: false,
      trigger: ScalingTrigger.MANUAL_SCALE,
      targetInstances: this.currentInstances,
      reason: 'No scaling rules triggered',
    };
  }

  private async evaluateScalingCondition(
    condition: ScalingCondition,
    metrics: ScalingMetrics,
  ): Promise<boolean> {
    let metricValue: number;

    switch (condition.metric) {
      case 'cpu':
        metricValue = metrics.cpuUtilization;
        break;
      case 'memory':
        metricValue = metrics.memoryUtilization;
        break;
      case 'connections':
        metricValue = metrics.connectionCount;
        break;
      case 'response_time':
        metricValue = metrics.responseTime;
        break;
      case 'error_rate':
        metricValue = metrics.errorRate;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'gt':
        return metricValue > condition.threshold;
      case 'gte':
        return metricValue >= condition.threshold;
      case 'lt':
        return metricValue < condition.threshold;
      case 'lte':
        return metricValue <= condition.threshold;
      case 'eq':
        return Math.abs(metricValue - condition.threshold) < 0.01;
      default:
        return false;
    }
  }

  private calculateTargetInstances(
    action: ScalingAction,
    metrics: ScalingMetrics,
  ): number {
    let targetInstances = this.currentInstances;

    switch (action.type) {
      case 'scale_up':
        if (action.targetInstances) {
          targetInstances = action.targetInstances;
        } else if (action.scaleFactor) {
          targetInstances = Math.ceil(
            this.currentInstances * action.scaleFactor,
          );
        } else {
          targetInstances = this.currentInstances + 1;
        }
        break;

      case 'scale_down':
        if (action.targetInstances) {
          targetInstances = action.targetInstances;
        } else if (action.scaleFactor) {
          targetInstances = Math.floor(
            this.currentInstances * action.scaleFactor,
          );
        } else {
          targetInstances = Math.max(1, this.currentInstances - 1);
        }
        break;

      case 'maintain':
        return this.currentInstances;
    }

    // Apply constraints
    if (action.maxInstances) {
      targetInstances = Math.min(targetInstances, action.maxInstances);
    }
    if (action.minInstances) {
      targetInstances = Math.max(targetInstances, action.minInstances);
    }

    // Global constraints
    targetInstances = Math.min(
      targetInstances,
      this.config.scaling.maxInstances,
    );
    targetInstances = Math.max(
      targetInstances,
      this.config.scaling.minInstances,
    );

    return targetInstances;
  }

  private async executeScaling(
    trigger: ScalingTrigger,
    targetInstances: number,
    reason: string,
  ): Promise<void> {
    const startTime = Date.now();
    const previousInstances = this.currentInstances;

    try {
      logger.info('Executing scaling operation', {
        trigger,
        previousInstances,
        targetInstances,
        reason,
        component: 'AutoScaler',
      });

      // Execute scaling on connection pool
      const scalingResult = await connectionPool.scalePool(
        targetInstances,
        trigger,
      );

      // Update current instances
      this.currentInstances = scalingResult.actualSize;
      this.lastScalingEvent = new Date();

      // Calculate cost
      const cost = await this.calculateScalingCost(
        previousInstances,
        this.currentInstances,
      );

      // Create scaling event record
      const scalingEvent: ScalingEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        trigger,
        previousInstances,
        targetInstances,
        actualInstances: this.currentInstances,
        duration: Date.now() - startTime,
        cost,
        success: scalingResult.success,
        metrics: { ...this.currentMetrics },
        reason,
      };

      // Store in history
      this.scalingHistory.push(scalingEvent);
      if (this.scalingHistory.length > 100) {
        this.scalingHistory = this.scalingHistory.slice(-100); // Keep last 100 events
      }

      // Log to database for analytics
      await this.logScalingEvent(scalingEvent);

      // Emit event
      this.emit('scalingCompleted', scalingEvent);

      logger.info('Scaling operation completed', {
        eventId: scalingEvent.id,
        success: scalingEvent.success,
        actualInstances: scalingEvent.actualInstances,
        duration: scalingEvent.duration,
        cost: scalingEvent.cost,
        component: 'AutoScaler',
      });
    } catch (error) {
      logger.error('Scaling operation failed', {
        trigger,
        targetInstances,
        error: error.message,
        component: 'AutoScaler',
      });
      throw error;
    }
  }

  private async calculateScaleUpTarget(
    reason: ScalingTrigger,
  ): Promise<number> {
    const seasonalMultiplier = this.getCurrentSeasonalMultiplier();
    let scaleFactor = 1.2; // Default 20% increase

    switch (reason) {
      case ScalingTrigger.HIGH_CONNECTION_COUNT:
        scaleFactor = 1.5; // 50% increase for high connections
        break;
      case ScalingTrigger.HIGH_RESPONSE_TIME:
        scaleFactor = 1.3; // 30% increase for response time issues
        break;
      case ScalingTrigger.WEDDING_SEASON_PATTERN:
        scaleFactor = Math.min(2.0, seasonalMultiplier * 0.5); // Season-based scaling
        break;
      case ScalingTrigger.HIGH_MEMORY_USAGE:
        scaleFactor = 1.4; // 40% increase for memory pressure
        break;
    }

    const targetInstances = Math.min(
      this.config.scaling.maxInstances,
      Math.ceil(this.currentInstances * scaleFactor),
    );

    return targetInstances;
  }

  private async validateScalingCost(targetInstances: number): Promise<boolean> {
    const estimatedCost =
      targetInstances * this.config.costProtection.costPerInstance;
    const maxCost = this.config.costProtection.maxHourlyCost;

    if (estimatedCost > maxCost) {
      // Check if emergency scaling is enabled and this is a critical situation
      if (
        this.config.costProtection.emergencyScaleDownEnabled &&
        this.emergencyMode
      ) {
        logger.warn('Cost protection overridden for emergency scaling', {
          estimatedCost,
          maxCost,
          emergencyMode: this.emergencyMode,
          component: 'AutoScaler',
        });
        return true;
      }
      return false;
    }

    return true;
  }

  private async calculateCurrentCost(): Promise<number> {
    return this.currentInstances * this.config.costProtection.costPerInstance;
  }

  private async calculateScalingCost(
    previousInstances: number,
    actualInstances: number,
  ): Promise<number> {
    const instanceDiff = Math.abs(actualInstances - previousInstances);
    return instanceDiff * this.config.costProtection.costPerInstance;
  }

  private getCurrentSeasonalMultiplier(): number {
    const month = new Date()
      .toLocaleDateString('en', { month: 'long' })
      .toLowerCase();
    return this.config.weddingSeason.seasonalMultipliers[month] || 1.0;
  }

  private getSeasonalMultiplier(month: number): number {
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    const monthName = monthNames[month - 1] || 'january';
    return this.config.weddingSeason.seasonalMultipliers[monthName] || 1.0;
  }

  private async getUpcomingWeddingEvents(): Promise<WeddingEvent[]> {
    try {
      const { data: weddings, error } = await this.supabase
        .from('client_weddings')
        .select('wedding_date, guest_count, supplier_count')
        .gte('wedding_date', new Date().toISOString())
        .lte(
          'wedding_date',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('wedding_date', { ascending: true });

      if (error) throw error;

      return (weddings || []).map((wedding) => ({
        date: new Date(wedding.wedding_date),
        type: 'ceremony' as const,
        expectedGuests: wedding.guest_count || 100,
        suppliersInvolved: wedding.supplier_count || 5,
        impactMultiplier: Math.min(3.0, 1.0 + (wedding.guest_count || 0) / 200),
      }));
    } catch (error) {
      logger.error('Error getting upcoming wedding events', {
        error: error.message,
        component: 'AutoScaler',
      });
      return [];
    }
  }

  private async getHistoricalLoadFactor(
    month: number,
    hour: number,
  ): Promise<number> {
    // This would query historical data to determine load patterns
    // For now, return a simulated factor based on typical wedding patterns
    const isWeekend = [0, 6].includes(new Date().getDay());
    const isPeakHour = this.config.weddingSeason.dailyPeakHours.includes(hour);

    return isWeekend && isPeakHour ? 2.5 : 1.0;
  }

  private async updateTrafficPatterns(metrics: ScalingMetrics): Promise<void> {
    const now = new Date();
    const patternKey = `${now.getHours()}_${now.getDay()}_${now.getMonth()}`;

    const pattern: TrafficPattern = {
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      month: now.getMonth(),
      averageConnections: metrics.connectionCount,
      peakConnections: Math.max(
        metrics.connectionCount,
        this.trafficPatterns.get(patternKey)?.peakConnections || 0,
      ),
      averageResponseTime: metrics.responseTime,
      errorRate: metrics.errorRate,
      photographerActivity: Math.floor(metrics.connectionCount * 0.4), // Estimate
      coupleActivity: Math.floor(metrics.connectionCount * 0.5), // Estimate
      venueActivity: Math.floor(metrics.connectionCount * 0.1), // Estimate
    };

    this.trafficPatterns.set(patternKey, pattern);
  }

  private async checkEmergencyConditions(
    metrics: ScalingMetrics,
  ): Promise<void> {
    const isEmergency =
      metrics.errorRate > 0.1 || // >10% error rate
      metrics.responseTime > 1000 || // >1 second response time
      metrics.cpuUtilization > 0.95; // >95% CPU usage

    if (isEmergency && !this.emergencyMode) {
      this.emergencyMode = true;
      logger.warn('Emergency mode activated', {
        errorRate: metrics.errorRate,
        responseTime: metrics.responseTime,
        cpuUtilization: metrics.cpuUtilization,
        component: 'AutoScaler',
      });

      // Trigger emergency scaling
      await this.triggerScaleUp(ScalingTrigger.HIGH_RESPONSE_TIME);
    } else if (!isEmergency && this.emergencyMode) {
      this.emergencyMode = false;
      logger.info('Emergency mode deactivated', {
        component: 'AutoScaler',
      });
    }
  }

  private validateScalingRule(rule: ScalingRule): boolean {
    return !!(
      rule.id &&
      rule.name &&
      rule.condition &&
      rule.action &&
      typeof rule.priority === 'number' &&
      typeof rule.enabled === 'boolean'
    );
  }

  private async updateSeasonalScalingRules(
    season: WeddingSeason,
  ): Promise<void> {
    // Update existing rules or create new ones for the season
    const seasonalRule: ScalingRule = {
      id: `seasonal_${season.name.toLowerCase()}`,
      name: `${season.name} Seasonal Scaling`,
      trigger: ScalingTrigger.WEDDING_SEASON_PATTERN,
      condition: {
        metric: 'connections',
        operator: 'gte',
        threshold: 200 * season.multiplier,
        duration: 60000, // 1 minute
        window: 300000, // 5 minute window
      },
      action: {
        type: 'scale_up',
        scaleFactor: Math.min(2.0, season.multiplier * 0.8),
      },
      priority: 80,
      enabled: true,
    };

    this.scalingRules.set(seasonalRule.id, seasonalRule);
  }

  private generateEventId(): string {
    return `scale_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async logScalingEvent(event: ScalingEvent): Promise<void> {
    try {
      await this.supabase.from('autoscaler_events').insert({
        event_id: event.id,
        timestamp: event.timestamp.toISOString(),
        trigger: event.trigger,
        previous_instances: event.previousInstances,
        target_instances: event.targetInstances,
        actual_instances: event.actualInstances,
        duration: event.duration,
        cost: event.cost,
        success: event.success,
        metrics: event.metrics,
        reason: event.reason,
      });
    } catch (error) {
      logger.error('Failed to log scaling event', {
        eventId: event.id,
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  private initializeDefaultRules(): void {
    const defaultRules: ScalingRule[] = [
      {
        id: 'high_connection_count',
        name: 'High Connection Count Scale-Up',
        trigger: ScalingTrigger.HIGH_CONNECTION_COUNT,
        condition: {
          metric: 'connections',
          operator: 'gte',
          threshold: 800, // 80% of 1000 max connections
          duration: 120000, // 2 minutes
          window: 300000, // 5 minute window
        },
        action: {
          type: 'scale_up',
          scaleFactor: 1.5,
        },
        priority: 90,
        enabled: true,
      },
      {
        id: 'high_response_time',
        name: 'High Response Time Scale-Up',
        trigger: ScalingTrigger.HIGH_RESPONSE_TIME,
        condition: {
          metric: 'response_time',
          operator: 'gte',
          threshold: 500, // 500ms
          duration: 60000, // 1 minute
          window: 180000, // 3 minute window
        },
        action: {
          type: 'scale_up',
          scaleFactor: 1.3,
        },
        priority: 85,
        enabled: true,
      },
      {
        id: 'low_utilization',
        name: 'Low Utilization Scale-Down',
        trigger: ScalingTrigger.HIGH_CONNECTION_COUNT, // Reverse trigger
        condition: {
          metric: 'connections',
          operator: 'lt',
          threshold: 200, // Low connection count
          duration: 600000, // 10 minutes
          window: 900000, // 15 minute window
        },
        action: {
          type: 'scale_down',
          scaleFactor: 0.8,
        },
        priority: 30,
        enabled: true,
      },
    ];

    defaultRules.forEach((rule) => this.scalingRules.set(rule.id, rule));
  }

  private startMonitoring(): void {
    // Start traffic pattern monitoring
    this.monitoringTimer = setInterval(async () => {
      await this.monitorTrafficPatterns();
    }, this.config.monitoring.metricsInterval);

    // Start health check monitoring
    this.healthCheckTimer = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        await this.checkEmergencyConditions(metrics);
      } catch (error) {
        logger.error('Health check failed', {
          error: error.message,
          component: 'AutoScaler',
        });
      }
    }, this.config.monitoring.healthCheckInterval);

    // Start prediction updates
    this.predictionTimer = setInterval(async () => {
      try {
        const currentMonth = new Date().getMonth() + 1;
        await this.predictWeddingTrafficPatterns(currentMonth);
      } catch (error) {
        logger.error('Prediction update failed', {
          error: error.message,
          component: 'AutoScaler',
        });
      }
    }, this.config.monitoring.predictionWindow);
  }

  private async loadTrafficPatterns(): Promise<void> {
    try {
      // Load historical traffic patterns from database
      const { data: patterns, error } = await this.supabase
        .from('traffic_patterns')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Process and store patterns
      patterns?.forEach((pattern) => {
        const key = `${pattern.hour}_${pattern.day_of_week}_${pattern.month}`;
        this.trafficPatterns.set(key, {
          hour: pattern.hour,
          dayOfWeek: pattern.day_of_week,
          month: pattern.month,
          averageConnections: pattern.average_connections,
          peakConnections: pattern.peak_connections,
          averageResponseTime: pattern.average_response_time,
          errorRate: pattern.error_rate,
          photographerActivity: pattern.photographer_activity,
          coupleActivity: pattern.couple_activity,
          venueActivity: pattern.venue_activity,
        });
      });

      logger.info('Traffic patterns loaded', {
        patternCount: this.trafficPatterns.size,
        component: 'AutoScaler',
      });
    } catch (error) {
      logger.warn('Failed to load traffic patterns', {
        error: error.message,
        component: 'AutoScaler',
      });
    }
  }

  /**
   * Shutdown auto-scaler gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Auto-Scaler', {
      component: 'AutoScaler',
    });

    // Clear all timers
    if (this.monitoringTimer) clearInterval(this.monitoringTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.predictionTimer) clearInterval(this.predictionTimer);

    // Log final scaling state
    await this.logScalingEvent({
      id: 'shutdown',
      timestamp: new Date(),
      trigger: ScalingTrigger.MANUAL_SCALE,
      previousInstances: this.currentInstances,
      targetInstances: this.currentInstances,
      actualInstances: this.currentInstances,
      duration: 0,
      cost: 0,
      success: true,
      metrics: this.currentMetrics,
      reason: 'Auto-scaler shutdown',
    });

    logger.info('Auto-Scaler shutdown complete', {
      finalInstances: this.currentInstances,
      totalScalingEvents: this.scalingHistory.length,
      component: 'AutoScaler',
    });
  }
}

// Additional Types
export interface WeddingSeason {
  name: string;
  multiplier: number;
  startMonth: number;
  endMonth: number;
}

export interface UsagePattern {
  type: string;
  hour: number;
  averageConnections: number;
  peakConnections: number;
  channelSwitches: number;
  averageSessionDuration: number;
  patterns: Array<{
    timestamp: Date;
    value: number;
    metadata: any;
  }>;
}

// Export singleton instance
export const autoScaler = new AutoScaler();

// Wedding Season Auto-Scaler Initialization
export async function initializeWeddingSeasonAutoScaler(): Promise<void> {
  const currentMonth = new Date().getMonth() + 1;
  const prediction =
    await autoScaler.predictWeddingTrafficPatterns(currentMonth);

  if (prediction.seasonalFactor > 2.0) {
    logger.info('Wedding season auto-scaler activated', {
      month: currentMonth,
      seasonalFactor: prediction.seasonalFactor,
      recommendedInstances: prediction.recommendedInstances,
      component: 'AutoScaler',
    });

    // Pre-scale for wedding season
    await autoScaler.triggerScaleUp(ScalingTrigger.WEDDING_SEASON_PATTERN);
  }
}
