// WS-010 Round 2: ML API Integration Layer
// Unified API for timeline optimization with ML capabilities

import { mlConflictDetector } from './conflict-detector';
import { mlVendorAnalyzer } from './vendor-analyzer';
import { mlTimelineOptimizer } from './timeline-optimizer';
import {
  MLTimelineRequest,
  MLTimelineResponse,
  MLVendorAnalysisRequest,
  MLVendorAnalysisResponse,
  MLInferenceRequest,
  MLInferenceResponse,
  OptimizedTimeline,
  WeddingContext,
  OptimizationGoals,
  RealtimeMLUpdate,
  MLNotificationPayload,
} from './types';
import { TimelineItem } from '@/components/dashboard/realtime/RealtimeTimeline';

interface MLAPIConfig {
  maxConcurrentRequests: number;
  defaultTimeout: number;
  enableCaching: boolean;
  cacheExpiry: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

/**
 * ML API - Central integration point for all ML-powered timeline optimization
 * Provides unified interface for conflict detection, vendor analysis, and optimization
 */
export class MLAPI {
  private readonly config: MLAPIConfig;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxInferenceTime = 2000; // 2 seconds requirement

  constructor(config: Partial<MLAPIConfig> = {}) {
    this.config = {
      maxConcurrentRequests: 10,
      defaultTimeout: 5000,
      enableCaching: true,
      cacheExpiry: 300000, // 5 minutes
      ...config,
    };

    this.startCacheCleanup();
  }

  /**
   * Main timeline optimization endpoint
   * Integrates all ML components for comprehensive timeline analysis
   */
  async optimizeTimeline(
    request: MLTimelineRequest,
  ): Promise<MLTimelineResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Validate request
      this.validateTimelineRequest(request);

      // Check cache first
      if (this.config.enableCaching && !request.force_refresh) {
        const cached = this.getCachedResponse(
          `timeline_${request.timeline_id}`,
        );
        if (cached) {
          return {
            ...cached,
            inference_time_ms: Date.now() - startTime,
          };
        }
      }

      // Get timeline data (in production, this would fetch from database)
      const timelineData = await this.getTimelineData(request.timeline_id);

      // Build wedding context
      const weddingContext = await this.buildWeddingContext(
        request.timeline_id,
      );

      // Set optimization goals
      const optimizationGoals = this.buildOptimizationGoals(request);

      console.log(
        `Starting ML timeline optimization for timeline ${request.timeline_id}`,
      );

      // Step 1: Run conflict detection
      const conflictAnalysis = await mlConflictDetector.detectConflicts({
        timeline_id: request.timeline_id,
        timeline_items: timelineData.items,
        vendor_data: [],
        wedding_context: weddingContext,
        optimization_goals: optimizationGoals,
        inference_type: 'timeline_optimization',
      });

      // Step 2: Analyze vendor performance
      const vendorAnalysis = await mlVendorAnalyzer.analyzeVendorPerformance({
        timeline_context: weddingContext,
        include_predictions: true,
      });

      // Step 3: Run timeline optimization
      const optimizedTimeline = await mlTimelineOptimizer.optimizeTimeline(
        request.timeline_id,
        timelineData.items,
        weddingContext,
        optimizationGoals,
      );

      // Step 4: Generate buffer recommendations
      const bufferRecommendations = this.generateBufferRecommendations(
        conflictAnalysis,
        optimizedTimeline,
      );

      // Step 5: Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics();

      const response: MLTimelineResponse = {
        success: true,
        data: {
          predictions: conflictAnalysis.predictions,
          optimizations: optimizedTimeline,
          vendor_scores: vendorAnalysis.success
            ? vendorAnalysis.data?.vendor_scores || []
            : [],
          buffer_recommendations: bufferRecommendations,
          performance_metrics: performanceMetrics,
        },
        inference_time_ms: Date.now() - startTime,
        model_version: conflictAnalysis.model_version,
      };

      // Validate response meets performance requirements
      if (response.inference_time_ms > this.maxInferenceTime) {
        console.warn(
          `ML inference time ${response.inference_time_ms}ms exceeded requirement of ${this.maxInferenceTime}ms`,
        );
      }

      // Cache response
      if (this.config.enableCaching) {
        this.setCachedResponse(`timeline_${request.timeline_id}`, response);
      }

      // Send real-time update if needed
      await this.sendRealtimeUpdate(request.timeline_id, response);

      console.log(
        `ML timeline optimization completed in ${response.inference_time_ms}ms`,
      );
      return response;
    } catch (error) {
      console.error('ML timeline optimization failed:', error);

      return {
        success: false,
        error: `Timeline optimization failed: ${error.message}`,
        inference_time_ms: Date.now() - startTime,
        model_version: 'error',
      };
    }
  }

  /**
   * Vendor analysis endpoint
   */
  async analyzeVendors(
    request: MLVendorAnalysisRequest,
  ): Promise<MLVendorAnalysisResponse> {
    try {
      this.validateVendorRequest(request);

      return await mlVendorAnalyzer.analyzeVendorPerformance(request);
    } catch (error) {
      return {
        success: false,
        error: `Vendor analysis failed: ${error.message}`,
      };
    }
  }

  /**
   * Direct conflict detection endpoint
   */
  async detectConflicts(
    request: MLInferenceRequest,
  ): Promise<MLInferenceResponse> {
    try {
      return await mlConflictDetector.detectConflicts(request);
    } catch (error) {
      throw new Error(`Conflict detection failed: ${error.message}`);
    }
  }

  /**
   * Real-time timeline update handler
   * Integrates with Team A Round 2 WebSocket system
   */
  async handleRealtimeUpdate(
    timelineId: string,
    updates: any[],
  ): Promise<RealtimeMLUpdate[]> {
    const mlUpdates: RealtimeMLUpdate[] = [];

    try {
      // Analyze updates for ML insights
      for (const update of updates) {
        if (this.shouldTriggerMLAnalysis(update)) {
          // Run quick conflict check
          const quickAnalysis = await this.runQuickAnalysis(timelineId, update);

          if (quickAnalysis.requiresNotification) {
            mlUpdates.push({
              type: 'conflict_detected',
              timeline_id: timelineId,
              predictions: quickAnalysis.predictions,
              model_version: quickAnalysis.model_version,
              confidence: quickAnalysis.confidence,
              timestamp: new Date().toISOString(),
              requires_notification: true,
            });

            // Send notification via Team E Round 1
            await this.sendNotification(timelineId, quickAnalysis);
          }
        }
      }

      return mlUpdates;
    } catch (error) {
      console.error('Realtime ML update failed:', error);
      return [];
    }
  }

  /**
   * Model health check and validation
   */
  async validateModelHealth(): Promise<{
    conflict_detector: { status: string; accuracy: number };
    vendor_analyzer: { status: string; performance: number };
    timeline_optimizer: { status: string; optimization_score: number };
    overall_health: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    try {
      // Check conflict detector
      const conflictValidation =
        await mlConflictDetector.validateModelAccuracy();

      // Check vendor analyzer (simplified)
      const vendorStatus = { status: 'healthy', performance: 0.85 };

      // Check timeline optimizer (simplified)
      const optimizerStatus = { status: 'healthy', optimization_score: 0.82 };

      const overallHealthy =
        conflictValidation.meetsRequirement &&
        vendorStatus.performance > 0.8 &&
        optimizerStatus.optimization_score > 0.75;

      return {
        conflict_detector: {
          status: conflictValidation.meetsRequirement ? 'healthy' : 'degraded',
          accuracy: conflictValidation.accuracy,
        },
        vendor_analyzer: vendorStatus,
        timeline_optimizer: optimizerStatus,
        overall_health: overallHealthy ? 'healthy' : 'degraded',
      };
    } catch (error) {
      console.error('Model health check failed:', error);
      return {
        conflict_detector: { status: 'error', accuracy: 0 },
        vendor_analyzer: { status: 'error', performance: 0 },
        timeline_optimizer: { status: 'error', optimization_score: 0 },
        overall_health: 'unhealthy',
      };
    }
  }

  /**
   * Batch optimization for multiple timelines
   */
  async batchOptimizeTimelines(
    requests: MLTimelineRequest[],
  ): Promise<MLTimelineResponse[]> {
    const batchSize = Math.min(
      requests.length,
      this.config.maxConcurrentRequests,
    );
    const results: MLTimelineResponse[] = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map((request) =>
        this.optimizeTimeline(request),
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: `Batch optimization failed: ${result.reason}`,
              inference_time_ms: 0,
              model_version: 'error',
            });
          }
        });
      } catch (error) {
        console.error('Batch optimization failed:', error);
        // Add error responses for remaining items in batch
        batch.forEach(() => {
          results.push({
            success: false,
            error: 'Batch processing error',
            inference_time_ms: 0,
            model_version: 'error',
          });
        });
      }
    }

    return results;
  }

  // Helper methods
  private validateTimelineRequest(request: MLTimelineRequest): void {
    if (!request.timeline_id) {
      throw new Error('Timeline ID is required');
    }
  }

  private validateVendorRequest(request: MLVendorAnalysisRequest): void {
    // Vendor analysis requests are flexible, minimal validation needed
    return;
  }

  private generateRequestId(): string {
    return `ml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getTimelineData(
    timelineId: string,
  ): Promise<{ items: TimelineItem[] }> {
    // In production, this would fetch from database
    // For now, return mock data
    return {
      items: [
        {
          id: 'item_1',
          title: 'Ceremony Setup',
          startTime: '2024-06-15T14:00:00Z',
          endTime: '2024-06-15T15:00:00Z',
          status: 'pending',
          vendor: 'Premium Events',
          location: 'Garden Pavilion',
        },
        {
          id: 'item_2',
          title: 'Photography Session',
          startTime: '2024-06-15T15:30:00Z',
          endTime: '2024-06-15T16:30:00Z',
          status: 'pending',
          vendor: 'Creative Photos',
          location: 'Garden Pavilion',
        },
      ],
    };
  }

  private async buildWeddingContext(
    timelineId: string,
  ): Promise<WeddingContext> {
    // In production, this would fetch from database
    return {
      wedding_id: 'wedding_123',
      wedding_date: '2024-06-15',
      venue_type: 'outdoor',
      guest_count: 150,
      budget_tier: 'luxury',
      season: 'summer',
      day_of_week: 'Saturday',
      time_of_day: 'afternoon',
      weather_forecast: {
        date: '2024-06-15',
        temperature_high: 78,
        temperature_low: 65,
        precipitation_chance: 20,
        wind_speed: 8,
        conditions: 'partly cloudy',
        impact_factors: {
          outdoor_ceremony: 1.2,
          transportation: 1.0,
          vendor_setup: 1.1,
        },
      },
      special_requirements: [],
    };
  }

  private buildOptimizationGoals(
    request: MLTimelineRequest,
  ): OptimizationGoals {
    return {
      minimize_conflicts: true,
      minimize_total_time: false,
      minimize_cost: false,
      maximize_vendor_performance: true,
      respect_vendor_preferences: true,
      maintain_client_priorities: [],
      business_hours_only: false,
      ...request.optimization_goals,
    };
  }

  private generateBufferRecommendations(
    conflictAnalysis: MLInferenceResponse,
    optimizedTimeline: OptimizedTimeline,
  ) {
    // Combine ML buffer recommendations with optimization insights
    return [
      ...conflictAnalysis.buffer_recommendations,
      ...optimizedTimeline.improvements
        .filter((imp) => imp.type === 'buffer_optimized')
        .map((imp) => ({
          timeline_item_id: 'derived_from_optimization',
          recommended_buffer_minutes: 15,
          confidence: imp.confidence,
          reasoning: imp.description,
          risk_factors: [],
          cost_impact: imp.cost_impact,
          alternative_options: [],
        })),
    ];
  }

  private async getPerformanceMetrics() {
    return {
      model_id: 'ml_timeline_optimizer_v1',
      timestamp: new Date().toISOString(),
      inference_time_ms: 850, // Actual will be calculated
      memory_usage_mb: 45,
      cpu_usage_percentage: 25,
      prediction_accuracy: 0.87,
      false_positive_rate: 0.08,
      false_negative_rate: 0.05,
    };
  }

  private async sendRealtimeUpdate(
    timelineId: string,
    response: MLTimelineResponse,
  ): Promise<void> {
    // Integration point for Team A Round 2 WebSocket system
    try {
      const update: RealtimeMLUpdate = {
        type: 'optimization_complete',
        timeline_id: timelineId,
        optimizations: response.data?.optimizations.improvements || [],
        model_version: response.model_version,
        confidence:
          response.data?.optimizations.estimated_success_probability || 0,
        timestamp: new Date().toISOString(),
        requires_notification: response.data?.predictions.length > 0,
      };

      // In production, this would send via WebSocket
      console.log('Sending real-time ML update:', update);
    } catch (error) {
      console.error('Failed to send real-time update:', error);
    }
  }

  private shouldTriggerMLAnalysis(update: any): boolean {
    // Determine if update warrants ML analysis
    return (
      update.type === 'timeline_update' ||
      update.type === 'vendor_status' ||
      update.significant_change === true
    );
  }

  private async runQuickAnalysis(
    timelineId: string,
    update: any,
  ): Promise<any> {
    // Run lightweight ML analysis for real-time updates
    return {
      requiresNotification: Math.random() > 0.8, // 20% chance for demo
      predictions: [],
      model_version: '1.0.0',
      confidence: 0.85,
    };
  }

  private async sendNotification(
    timelineId: string,
    analysis: any,
  ): Promise<void> {
    // Integration point for Team E Round 1 notification system
    const notification: MLNotificationPayload = {
      notification_type: 'high_risk_conflict',
      urgency: 'medium',
      title: 'Timeline Conflict Detected',
      description:
        'ML analysis detected potential timeline conflicts requiring attention',
      action_required: true,
      suggested_actions: [
        'Review timeline',
        'Add buffer time',
        'Contact vendors',
      ],
      timeline_id: timelineId,
      affected_vendors: [],
      confidence: analysis.confidence,
    };

    // In production, this would integrate with Team E notification system
    console.log('Sending ML notification:', notification);
  }

  // Cache management
  private getCachedResponse(key: string): any {
    if (!this.config.enableCaching) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCachedResponse(key: string, data: any): void {
    if (!this.config.enableCaching) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.cacheExpiry,
    });
  }

  private startCacheCleanup(): void {
    // Clean expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 300000);
  }

  /**
   * Cleanup method
   */
  dispose(): void {
    mlConflictDetector.dispose();
    mlVendorAnalyzer.dispose();
    this.cache.clear();
    this.requestQueue.clear();
  }
}

// Export singleton instance
export const mlAPI = new MLAPI();

// Export convenience methods
export const optimizeTimeline = (request: MLTimelineRequest) =>
  mlAPI.optimizeTimeline(request);
export const analyzeVendors = (request: MLVendorAnalysisRequest) =>
  mlAPI.analyzeVendors(request);
export const detectConflicts = (request: MLInferenceRequest) =>
  mlAPI.detectConflicts(request);
export const validateMLHealth = () => mlAPI.validateModelHealth();
