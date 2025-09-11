/**
 * WS-189 Touch Analytics Repository - Team B Backend
 * Database coordination for touch analytics with privacy-compliant data processing
 * Cross-device analytics aggregation with unified reporting capabilities
 */

import { createClient } from '@/lib/supabase/client';
import crypto from 'crypto';

export interface TouchAnalyticsData {
  id?: string;
  hashed_user_id?: string;
  session_id: string;
  gesture_type: string;
  response_time: number;
  target_response_time: number;
  performance_deviation: number;
  deviation_percentage: number;
  success: boolean;
  timestamp: string;
  device_context: {
    type: 'mobile' | 'tablet' | 'desktop';
    os?: string;
    browser?: string;
    screen_size?: string;
    connection_type?: string;
    cpu_performance?: number;
  };
  workflow_context: {
    workflow_type: string;
    urgency_level: 'emergency' | 'high' | 'normal' | 'low';
    concurrent_operations?: number;
  };
  created_at?: string;
}

export interface TouchPreferencesData {
  id?: string;
  hashed_user_id: string;
  device_id: string;
  preferences: {
    touch_target_size: 'small' | 'medium' | 'large' | 'extra-large';
    haptic_feedback: boolean;
    visual_feedback: boolean;
    response_sensitivity: 'low' | 'medium' | 'high';
    gesture_shortcuts: boolean;
    accessibility_mode: boolean;
    gesture_confirmations: boolean;
  };
  workflow_preferences: {
    emergency_gestures: boolean;
    photo_confirmation_style: 'single-tap' | 'double-tap' | 'long-press';
    navigation_swipes: boolean;
    quick_actions: string[];
  };
  device_specific?: {
    screen_size: 'small' | 'medium' | 'large';
    orientation_lock: boolean;
    force_touch_support: boolean;
    vibration_intensity: number;
  };
  last_updated: string;
  sync_source?: string;
  version: number;
}

export interface TouchPerformanceAggregates {
  gesture_type: string;
  workflow_type: string;
  time_period: string;
  total_interactions: number;
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  success_rate: number;
  target_hit_rate: number;
  performance_trend: 'improving' | 'stable' | 'degrading';
  device_breakdown: Record<string, number>;
  created_at: string;
}

export interface AnalyticsQueryOptions {
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  gestureTypes?: string[];
  workflowTypes?: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
  aggregation?: 'none' | 'hourly' | 'daily' | 'weekly';
  includeDeviceContext?: boolean;
  anonymize?: boolean;
}

export class TouchAnalyticsRepository {
  private supabase = createClient();
  private batchSize = 100;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private queryCache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Store touch analytics data with privacy compliance
   */
  async storeTouchAnalytics(
    analyticsData: TouchAnalyticsData[],
    options: { batchInsert: boolean; validateData: boolean } = {
      batchInsert: true,
      validateData: true,
    },
  ): Promise<{
    success: boolean;
    inserted_count: number;
    failed_count: number;
    errors?: string[];
  }> {
    try {
      if (options.validateData) {
        this.validateAnalyticsData(analyticsData);
      }

      let insertedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      if (options.batchInsert) {
        // Process in batches for efficiency
        for (let i = 0; i < analyticsData.length; i += this.batchSize) {
          const batch = analyticsData.slice(i, i + this.batchSize);

          const { data, error } = await this.supabase
            .from('touch_analytics')
            .insert(batch)
            .select('id');

          if (error) {
            failedCount += batch.length;
            errors.push(
              `Batch ${Math.floor(i / this.batchSize) + 1}: ${error.message}`,
            );
          } else {
            insertedCount += data?.length || 0;
          }
        }
      } else {
        // Insert individual records
        for (const record of analyticsData) {
          const { data, error } = await this.supabase
            .from('touch_analytics')
            .insert([record])
            .select('id');

          if (error) {
            failedCount++;
            errors.push(`Record ${record.session_id}: ${error.message}`);
          } else {
            insertedCount++;
          }
        }
      }

      // Update real-time aggregates if successful insertions
      if (insertedCount > 0) {
        await this.updatePerformanceAggregates(analyticsData);
      }

      return {
        success: insertedCount > 0,
        inserted_count: insertedCount,
        failed_count: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Touch analytics storage error:', error);
      throw error;
    }
  }

  /**
   * Query touch analytics with flexible filtering and aggregation
   */
  async queryTouchAnalytics(options: AnalyticsQueryOptions): Promise<{
    data: TouchAnalyticsData[];
    total_count: number;
    aggregated_metrics?: TouchPerformanceAggregates[];
    query_performance: number;
  }> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      const cached = this.queryCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return {
          ...cached.data,
          query_performance: Date.now() - startTime,
        };
      }

      // Build query
      let query = this.supabase
        .from('touch_analytics')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.userId) {
        const hashedUserId = await this.hashUserId(options.userId);
        query = query.eq('hashed_user_id', hashedUserId);
      }

      if (options.sessionId) {
        query = query.eq('session_id', options.sessionId);
      }

      if (options.gestureTypes && options.gestureTypes.length > 0) {
        query = query.in('gesture_type', options.gestureTypes);
      }

      if (options.workflowTypes && options.workflowTypes.length > 0) {
        query = query.or(
          options.workflowTypes
            .map((wt) => `workflow_context.workflow_type.eq.${wt}`)
            .join(','),
        );
      }

      if (options.timeRange) {
        query = query
          .gte('timestamp', options.timeRange.start)
          .lte('timestamp', options.timeRange.end);
      }

      // Apply pagination
      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 1000) - 1,
        );
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      // Execute query
      const { data, error, count } = await query.order('timestamp', {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      let processedData = data || [];

      // Apply anonymization if requested
      if (options.anonymize) {
        processedData = this.anonymizeAnalyticsData(processedData);
      }

      // Remove device context if not needed (reduces payload size)
      if (!options.includeDeviceContext) {
        processedData = processedData.map(
          ({ device_context, ...rest }) => rest,
        );
      }

      // Generate aggregated metrics if requested
      let aggregatedMetrics: TouchPerformanceAggregates[] | undefined;
      if (options.aggregation && options.aggregation !== 'none') {
        aggregatedMetrics = await this.generateAggregatedMetrics(
          processedData,
          options.aggregation,
        );
      }

      const result = {
        data: processedData,
        total_count: count || 0,
        aggregated_metrics: aggregatedMetrics,
        query_performance: Date.now() - startTime,
      };

      // Cache result
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('Touch analytics query error:', error);
      throw error;
    }
  }

  /**
   * Store and sync user touch preferences across devices
   */
  async storeTouchPreferences(preferencesData: TouchPreferencesData): Promise<{
    success: boolean;
    preferences: TouchPreferencesData;
    sync_status: 'completed' | 'pending' | 'failed';
  }> {
    try {
      // Validate preferences data
      this.validatePreferencesData(preferencesData);

      // Upsert preferences
      const { data, error } = await this.supabase
        .from('user_touch_preferences')
        .upsert(preferencesData, {
          onConflict: 'hashed_user_id,device_id',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Trigger cross-device sync
      const syncStatus = await this.triggerPreferenceSync(
        preferencesData.hashed_user_id,
        preferencesData.device_id,
      );

      return {
        success: true,
        preferences: data,
        sync_status: syncStatus,
      };
    } catch (error) {
      console.error('Touch preferences storage error:', error);
      throw error;
    }
  }

  /**
   * Retrieve user preferences with cross-device inheritance
   */
  async getUserTouchPreferences(
    userId: string,
    deviceId?: string,
  ): Promise<{
    preferences: TouchPreferencesData | null;
    inheritance_chain: string[];
    device_count: number;
    last_sync: string | null;
  }> {
    try {
      const hashedUserId = await this.hashUserId(userId);

      // Get all user preferences
      const { data: allPreferences, error } = await this.supabase
        .from('user_touch_preferences')
        .select('*')
        .eq('hashed_user_id', hashedUserId)
        .order('last_updated', { ascending: false });

      if (error) {
        throw error;
      }

      if (!allPreferences || allPreferences.length === 0) {
        return {
          preferences: null,
          inheritance_chain: [],
          device_count: 0,
          last_sync: null,
        };
      }

      // Apply preference inheritance
      const { preferences, inheritanceChain } = this.applyPreferenceInheritance(
        allPreferences,
        deviceId,
      );

      return {
        preferences,
        inheritance_chain: inheritanceChain,
        device_count: allPreferences.length,
        last_sync: allPreferences[0]?.last_updated || null,
      };
    } catch (error) {
      console.error('Touch preferences retrieval error:', error);
      throw error;
    }
  }

  /**
   * Generate performance reports with historical trend analysis
   */
  async generatePerformanceReport(
    userId?: string,
    timeRange: { start: string; end: string } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
  ): Promise<{
    summary: {
      total_interactions: number;
      unique_sessions: number;
      average_response_time: number;
      success_rate: number;
      performance_score: number;
      trend: 'improving' | 'stable' | 'degrading';
    };
    gesture_analysis: Array<{
      gesture_type: string;
      performance_metrics: TouchPerformanceAggregates;
      recommendations: string[];
    }>;
    device_analysis: Array<{
      device_type: string;
      performance_comparison: number; // percentage difference from average
      optimization_opportunities: string[];
    }>;
    workflow_analysis: Array<{
      workflow_type: string;
      urgency_breakdown: Record<string, number>;
      performance_by_urgency: Record<string, number>;
    }>;
    historical_trends: Array<{
      date: string;
      avg_response_time: number;
      success_rate: number;
      interaction_count: number;
    }>;
  }> {
    try {
      // Query analytics data for the time range
      const analyticsData = await this.queryTouchAnalytics({
        userId,
        timeRange,
        limit: 50000, // Large limit for comprehensive analysis
        includeDeviceContext: true,
      });

      const data = analyticsData.data;

      if (data.length === 0) {
        return this.getEmptyPerformanceReport();
      }

      // Generate summary metrics
      const summary = this.calculateSummaryMetrics(data);

      // Analyze by gesture type
      const gestureAnalysis = await this.analyzeGesturePerformance(data);

      // Analyze by device type
      const deviceAnalysis = this.analyzeDevicePerformance(data);

      // Analyze by workflow type
      const workflowAnalysis = this.analyzeWorkflowPerformance(data);

      // Generate historical trends
      const historicalTrends = await this.generateHistoricalTrends(
        userId,
        timeRange,
      );

      return {
        summary,
        gesture_analysis: gestureAnalysis,
        device_analysis: deviceAnalysis,
        workflow_analysis: workflowAnalysis,
        historical_trends: historicalTrends,
      };
    } catch (error) {
      console.error('Performance report generation error:', error);
      throw error;
    }
  }

  /**
   * Clean up old analytics data according to retention policies
   */
  async cleanupAnalyticsData(retentionPeriodDays: number = 365): Promise<{
    deleted_records: number;
    cleanup_duration: number;
    storage_freed_mb: number;
  }> {
    const startTime = Date.now();

    try {
      const cutoffDate = new Date(
        Date.now() - retentionPeriodDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Delete old analytics data
      const { data: deletedData, error } = await this.supabase
        .from('touch_analytics')
        .delete()
        .lt('created_at', cutoffDate)
        .select('id');

      if (error) {
        throw error;
      }

      const deletedRecords = deletedData?.length || 0;
      const cleanupDuration = Date.now() - startTime;

      // Estimate storage freed (rough calculation)
      const storageFreedMb = Math.round((deletedRecords * 1.5) / 1024); // ~1.5KB per record

      // Update aggregated metrics after cleanup
      await this.recalculatePerformanceAggregates();

      return {
        deleted_records: deletedRecords,
        cleanup_duration: cleanupDuration,
        storage_freed_mb: storageFreedMb,
      };
    } catch (error) {
      console.error('Analytics cleanup error:', error);
      throw error;
    }
  }

  /**
   * Delete all user data for GDPR compliance
   */
  async deleteUserData(userId: string): Promise<{
    success: boolean;
    deleted_items: {
      analytics_records: number;
      preferences: number;
      aggregates: number;
    };
  }> {
    try {
      const hashedUserId = await this.hashUserId(userId);

      // Delete analytics data
      const { data: deletedAnalytics } = await this.supabase
        .from('touch_analytics')
        .delete()
        .eq('hashed_user_id', hashedUserId)
        .select('id');

      // Delete preferences
      const { data: deletedPreferences } = await this.supabase
        .from('user_touch_preferences')
        .delete()
        .eq('hashed_user_id', hashedUserId)
        .select('id');

      // Delete performance aggregates
      const { data: deletedAggregates } = await this.supabase
        .from('touch_performance_metrics')
        .delete()
        .eq('hashed_user_id', hashedUserId)
        .select('id');

      // Log GDPR deletion
      await this.supabase.from('gdpr_deletion_log').insert({
        hashed_user_id: hashedUserId,
        deletion_type: 'complete_user_data',
        items_deleted: {
          analytics: deletedAnalytics?.length || 0,
          preferences: deletedPreferences?.length || 0,
          aggregates: deletedAggregates?.length || 0,
        },
        requested_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      return {
        success: true,
        deleted_items: {
          analytics_records: deletedAnalytics?.length || 0,
          preferences: deletedPreferences?.length || 0,
          aggregates: deletedAggregates?.length || 0,
        },
      };
    } catch (error) {
      console.error('User data deletion error:', error);
      throw error;
    }
  }

  // Private helper methods

  private async hashUserId(userId: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private validateAnalyticsData(data: TouchAnalyticsData[]): void {
    for (const record of data) {
      if (
        !record.session_id ||
        !record.gesture_type ||
        typeof record.response_time !== 'number'
      ) {
        throw new Error('Invalid analytics data: missing required fields');
      }

      if (record.response_time < 0 || record.response_time > 10000) {
        throw new Error('Invalid response time: must be between 0 and 10000ms');
      }
    }
  }

  private validatePreferencesData(data: TouchPreferencesData): void {
    if (!data.hashed_user_id || !data.device_id) {
      throw new Error('Invalid preferences data: missing user ID or device ID');
    }

    if (!data.preferences || !data.workflow_preferences) {
      throw new Error('Invalid preferences data: missing preferences object');
    }
  }

  private generateCacheKey(options: AnalyticsQueryOptions): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex');
  }

  private anonymizeAnalyticsData(
    data: TouchAnalyticsData[],
  ): TouchAnalyticsData[] {
    return data.map((record) => ({
      ...record,
      hashed_user_id: undefined,
      session_id: `session_${Math.random().toString(36).substr(2, 9)}`,
      device_context: {
        ...record.device_context,
        os: record.device_context.os
          ? record.device_context.os.split(' ')[0]
          : undefined,
        browser: record.device_context.browser
          ? record.device_context.browser.split(' ')[0]
          : undefined,
      },
    }));
  }

  private async updatePerformanceAggregates(
    analyticsData: TouchAnalyticsData[],
  ): Promise<void> {
    try {
      // Use PostgreSQL function for efficient aggregation
      await this.supabase.rpc('update_touch_performance_aggregates', {
        p_analytics_data: JSON.stringify(analyticsData),
      });
    } catch (error) {
      console.error('Performance aggregates update error:', error);
    }
  }

  private async generateAggregatedMetrics(
    data: TouchAnalyticsData[],
    aggregation: 'hourly' | 'daily' | 'weekly',
  ): Promise<TouchPerformanceAggregates[]> {
    // Group data by time periods
    const timeGroups = this.groupByTimePeriod(data, aggregation);

    return Object.entries(timeGroups).map(([timePeriod, records]) => ({
      gesture_type: 'all',
      workflow_type: 'all',
      time_period: timePeriod,
      total_interactions: records.length,
      avg_response_time:
        records.reduce((sum, r) => sum + r.response_time, 0) / records.length,
      min_response_time: Math.min(...records.map((r) => r.response_time)),
      max_response_time: Math.max(...records.map((r) => r.response_time)),
      success_rate: records.filter((r) => r.success).length / records.length,
      target_hit_rate:
        records.filter((r) => r.response_time <= r.target_response_time)
          .length / records.length,
      performance_trend: 'stable', // Would be calculated based on historical comparison
      device_breakdown: this.calculateDeviceBreakdown(records),
      created_at: new Date().toISOString(),
    }));
  }

  private groupByTimePeriod(
    data: TouchAnalyticsData[],
    aggregation: string,
  ): Record<string, TouchAnalyticsData[]> {
    return data.reduce(
      (groups, record) => {
        const date = new Date(record.timestamp);
        let key: string;

        switch (aggregation) {
          case 'hourly':
            key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
            break;
          case 'daily':
            key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            break;
          case 'weekly':
            const weekStart = new Date(
              date.getTime() - date.getDay() * 24 * 60 * 60 * 1000,
            );
            key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
            break;
          default:
            key = date.toISOString().split('T')[0];
        }

        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(record);

        return groups;
      },
      {} as Record<string, TouchAnalyticsData[]>,
    );
  }

  private calculateDeviceBreakdown(
    records: TouchAnalyticsData[],
  ): Record<string, number> {
    return records.reduce(
      (breakdown, record) => {
        const deviceType = record.device_context.type;
        breakdown[deviceType] = (breakdown[deviceType] || 0) + 1;
        return breakdown;
      },
      {} as Record<string, number>,
    );
  }

  private applyPreferenceInheritance(
    preferences: TouchPreferencesData[],
    deviceId?: string,
  ): { preferences: TouchPreferencesData; inheritanceChain: string[] } {
    if (preferences.length === 0) {
      throw new Error('No preferences found');
    }

    // If specific device requested and found, return it
    if (deviceId) {
      const devicePrefs = preferences.find((p) => p.device_id === deviceId);
      if (devicePrefs) {
        return {
          preferences: devicePrefs,
          inheritanceChain: [deviceId],
        };
      }
    }

    // Otherwise, merge preferences with inheritance
    const sorted = [...preferences].sort(
      (a, b) =>
        new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime(),
    );

    const merged = {
      ...sorted[0],
      preferences: {},
      workflow_preferences: {},
      device_specific: null,
    };

    const inheritanceChain: string[] = [];

    // Merge from oldest to newest (newest wins)
    for (const pref of sorted.reverse()) {
      merged.preferences = { ...merged.preferences, ...pref.preferences };
      merged.workflow_preferences = {
        ...merged.workflow_preferences,
        ...pref.workflow_preferences,
      };
      inheritanceChain.push(pref.device_id);
    }

    return {
      preferences: merged as TouchPreferencesData,
      inheritanceChain,
    };
  }

  private async triggerPreferenceSync(
    hashedUserId: string,
    sourceDeviceId: string,
  ): Promise<'completed' | 'pending' | 'failed'> {
    try {
      // Get all user devices
      const { data: devices } = await this.supabase
        .from('user_touch_preferences')
        .select('device_id')
        .eq('hashed_user_id', hashedUserId)
        .neq('device_id', sourceDeviceId);

      if (!devices || devices.length === 0) {
        return 'completed'; // No other devices to sync
      }

      // Queue sync job
      await this.supabase.from('preference_sync_queue').insert({
        hashed_user_id: hashedUserId,
        source_device: sourceDeviceId,
        target_devices: devices.map((d) => d.device_id),
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      return 'pending';
    } catch (error) {
      console.error('Preference sync trigger error:', error);
      return 'failed';
    }
  }

  private calculateSummaryMetrics(data: TouchAnalyticsData[]) {
    const uniqueSessions = new Set(data.map((d) => d.session_id)).size;
    const avgResponseTime =
      data.reduce((sum, d) => sum + d.response_time, 0) / data.length;
    const successRate = data.filter((d) => d.success).length / data.length;
    const targetHitRate =
      data.filter((d) => d.response_time <= d.target_response_time).length /
      data.length;

    // Calculate performance score (0-100)
    const responseScore = Math.max(0, 100 - avgResponseTime / 10);
    const successScore = successRate * 100;
    const targetScore = targetHitRate * 100;
    const performanceScore = (responseScore + successScore + targetScore) / 3;

    // Calculate trend
    const trend = this.calculateTrend(data);

    return {
      total_interactions: data.length,
      unique_sessions: uniqueSessions,
      average_response_time: Math.round(avgResponseTime * 100) / 100,
      success_rate: Math.round(successRate * 10000) / 100,
      performance_score: Math.round(performanceScore * 100) / 100,
      trend,
    };
  }

  private calculateTrend(
    data: TouchAnalyticsData[],
  ): 'improving' | 'stable' | 'degrading' {
    if (data.length < 10) return 'stable';

    const sorted = [...data].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, d) => sum + d.response_time, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, d) => sum + d.response_time, 0) /
      secondHalf.length;

    const changePercentage = (secondAvg - firstAvg) / firstAvg;

    if (changePercentage > 0.1) return 'degrading';
    if (changePercentage < -0.1) return 'improving';
    return 'stable';
  }

  private async analyzeGesturePerformance(data: TouchAnalyticsData[]) {
    const gestureGroups = data.reduce(
      (groups, d) => {
        if (!groups[d.gesture_type]) {
          groups[d.gesture_type] = [];
        }
        groups[d.gesture_type].push(d);
        return groups;
      },
      {} as Record<string, TouchAnalyticsData[]>,
    );

    return Object.entries(gestureGroups).map(([gestureType, records]) => {
      const performanceMetrics: TouchPerformanceAggregates = {
        gesture_type: gestureType,
        workflow_type: 'mixed',
        time_period: 'current',
        total_interactions: records.length,
        avg_response_time:
          records.reduce((sum, r) => sum + r.response_time, 0) / records.length,
        min_response_time: Math.min(...records.map((r) => r.response_time)),
        max_response_time: Math.max(...records.map((r) => r.response_time)),
        success_rate: records.filter((r) => r.success).length / records.length,
        target_hit_rate:
          records.filter((r) => r.response_time <= r.target_response_time)
            .length / records.length,
        performance_trend: this.calculateTrend(records),
        device_breakdown: this.calculateDeviceBreakdown(records),
        created_at: new Date().toISOString(),
      };

      const recommendations =
        this.generateGestureRecommendations(performanceMetrics);

      return {
        gesture_type: gestureType,
        performance_metrics: performanceMetrics,
        recommendations,
      };
    });
  }

  private analyzeDevicePerformance(data: TouchAnalyticsData[]) {
    const deviceGroups = data.reduce(
      (groups, d) => {
        const deviceType = d.device_context.type;
        if (!groups[deviceType]) {
          groups[deviceType] = [];
        }
        groups[deviceType].push(d);
        return groups;
      },
      {} as Record<string, TouchAnalyticsData[]>,
    );

    const overallAvg =
      data.reduce((sum, d) => sum + d.response_time, 0) / data.length;

    return Object.entries(deviceGroups).map(([deviceType, records]) => {
      const deviceAvg =
        records.reduce((sum, r) => sum + r.response_time, 0) / records.length;
      const performanceComparison =
        ((deviceAvg - overallAvg) / overallAvg) * 100;

      const optimizationOpportunities = this.generateDeviceOptimizations(
        deviceType,
        performanceComparison,
      );

      return {
        device_type: deviceType,
        performance_comparison: Math.round(performanceComparison * 100) / 100,
        optimization_opportunities: optimizationOpportunities,
      };
    });
  }

  private analyzeWorkflowPerformance(data: TouchAnalyticsData[]) {
    const workflowGroups = data.reduce(
      (groups, d) => {
        const workflowType = d.workflow_context.workflow_type;
        if (!groups[workflowType]) {
          groups[workflowType] = [];
        }
        groups[workflowType].push(d);
        return groups;
      },
      {} as Record<string, TouchAnalyticsData[]>,
    );

    return Object.entries(workflowGroups).map(([workflowType, records]) => {
      const urgencyBreakdown = records.reduce(
        (breakdown, r) => {
          const urgency = r.workflow_context.urgency_level;
          breakdown[urgency] = (breakdown[urgency] || 0) + 1;
          return breakdown;
        },
        {} as Record<string, number>,
      );

      const performanceByUrgency = records.reduce(
        (perf, r) => {
          const urgency = r.workflow_context.urgency_level;
          if (!perf[urgency]) {
            perf[urgency] = { total: 0, sum: 0 };
          }
          perf[urgency].total++;
          perf[urgency].sum += r.response_time;
          return perf;
        },
        {} as Record<string, { total: number; sum: number }>,
      );

      const avgByUrgency = Object.entries(performanceByUrgency).reduce(
        (avg, [urgency, data]) => {
          avg[urgency] = data.sum / data.total;
          return avg;
        },
        {} as Record<string, number>,
      );

      return {
        workflow_type: workflowType,
        urgency_breakdown: urgencyBreakdown,
        performance_by_urgency: avgByUrgency,
      };
    });
  }

  private async generateHistoricalTrends(
    userId?: string,
    timeRange: { start: string; end: string },
  ) {
    try {
      // Query daily aggregated data
      let query = this.supabase
        .from('touch_performance_metrics')
        .select(
          'created_at, avg_response_time, success_rate, total_interactions',
        )
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end);

      if (userId) {
        const hashedUserId = await this.hashUserId(userId);
        query = query.eq('hashed_user_id', hashedUserId);
      }

      const { data: trends } = await query.order('created_at', {
        ascending: true,
      });

      return (trends || []).map((trend) => ({
        date: trend.created_at.split('T')[0],
        avg_response_time: trend.avg_response_time,
        success_rate: trend.success_rate * 100, // Convert to percentage
        interaction_count: trend.total_interactions,
      }));
    } catch (error) {
      console.error('Historical trends generation error:', error);
      return [];
    }
  }

  private getEmptyPerformanceReport() {
    return {
      summary: {
        total_interactions: 0,
        unique_sessions: 0,
        average_response_time: 0,
        success_rate: 0,
        performance_score: 0,
        trend: 'stable' as const,
      },
      gesture_analysis: [],
      device_analysis: [],
      workflow_analysis: [],
      historical_trends: [],
    };
  }

  private generateGestureRecommendations(
    metrics: TouchPerformanceAggregates,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.avg_response_time > 100) {
      recommendations.push(
        'Consider increasing touch target size for faster responses',
      );
    }

    if (metrics.success_rate < 0.9) {
      recommendations.push('Enable haptic feedback to improve touch accuracy');
    }

    if (metrics.target_hit_rate < 0.8) {
      recommendations.push(
        'Review and adjust performance targets for this gesture',
      );
    }

    return recommendations;
  }

  private generateDeviceOptimizations(
    deviceType: string,
    performanceComparison: number,
  ): string[] {
    const optimizations: string[] = [];

    if (performanceComparison > 20) {
      // 20% slower than average
      if (deviceType === 'mobile') {
        optimizations.push(
          'Enable hardware acceleration for mobile touch events',
        );
        optimizations.push('Optimize for smaller screen touch targets');
      } else if (deviceType === 'tablet') {
        optimizations.push('Adjust touch sensitivity for tablet interactions');
      }
    }

    if (performanceComparison > 50) {
      // 50% slower than average
      optimizations.push('Consider device-specific performance optimizations');
      optimizations.push(
        'Implement progressive enhancement for slower devices',
      );
    }

    return optimizations;
  }

  private async recalculatePerformanceAggregates(): Promise<void> {
    try {
      await this.supabase.rpc('recalculate_touch_performance_aggregates');
    } catch (error) {
      console.error('Performance aggregates recalculation error:', error);
    }
  }
}

// Export singleton instance
export const touchAnalyticsRepository = new TouchAnalyticsRepository();
