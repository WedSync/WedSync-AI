/**
 * WS-144: Offline Analytics Tracking System
 * Tracks usage patterns, sync performance, and offline behavior
 *
 * Features:
 * - Event tracking while offline
 * - Performance metrics collection
 * - User behavior analysis
 * - Sync performance monitoring
 * - Data usage optimization insights
 */

import { offlineDB } from '@/lib/database/offline-database';
import { optimizedBackgroundSync } from './optimized-background-sync';
import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export type EventCategory =
  | 'navigation'
  | 'interaction'
  | 'sync'
  | 'error'
  | 'performance'
  | 'network'
  | 'storage';

export interface AnalyticsEvent {
  id: string;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  deviceId: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  context?: Record<string, any>;
}

export interface OfflineSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  eventsCount: number;
  dataModified: number; // bytes
  conflictsEncountered: number;
  syncSuccess: boolean;
  deviceInfo: {
    type: string;
    browser: string;
    connectionType?: string;
  };
}

export interface AnalyticsReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalEvents: number;
    offlineEvents: number;
    offlinePercentage: number;
    averageOfflineDuration: number;
    mostCommonActions: Array<{ action: string; count: number }>;
    syncPerformance: {
      averageTime: number;
      successRate: number;
      dataTransferred: number;
    };
  };
  insights: {
    peakOfflineHours: number[];
    problemAreas: string[];
    recommendations: string[];
  };
}

// =====================================================
// OFFLINE ANALYTICS SERVICE
// =====================================================

export class OfflineAnalyticsService {
  private static instance: OfflineAnalyticsService;
  private eventQueue: AnalyticsEvent[] = [];
  private currentSession?: OfflineSession;
  private sessionId: string;
  private deviceId: string;
  private performanceObserver?: PerformanceObserver;
  private syncBatchSize = 100;
  private isInitialized = false;

  public static getInstance(): OfflineAnalyticsService {
    if (!OfflineAnalyticsService.instance) {
      OfflineAnalyticsService.instance = new OfflineAnalyticsService();
    }
    return OfflineAnalyticsService.instance;
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceId = this.getDeviceId();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[OfflineAnalytics] Initializing analytics service');

    // Start session tracking
    this.startSession();

    // Set up performance monitoring
    this.setupPerformanceMonitoring();

    // Set up event listeners
    this.setupEventListeners();

    // Load pending events
    await this.loadPendingEvents();

    // Start periodic sync
    this.startPeriodicSync();

    this.isInitialized = true;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('wedsync_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('wedsync_device_id', deviceId);
    }
    return deviceId;
  }

  // =====================================================
  // EVENT TRACKING
  // =====================================================

  async trackEvent(
    category: EventCategory,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      action,
      label,
      value,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      isOffline: !navigator.onLine,
      syncStatus: 'pending',
    };

    // Add to queue
    this.eventQueue.push(event);

    // Store in IndexedDB
    await this.storeEvent(event);

    // Update session
    if (this.currentSession) {
      this.currentSession.eventsCount++;
    }

    // Sync immediately if online and critical
    if (
      navigator.onLine &&
      (category === 'error' || metadata?.priority === 'high')
    ) {
      await this.syncEvents([event]);
    }
  }

  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    await this.trackEvent('performance', metric.name, undefined, metric.value, {
      unit: metric.unit,
      context: metric.context,
    });
  }

  async trackSyncOperation(
    operation: string,
    duration: number,
    dataSize: number,
    success: boolean,
    conflicts?: number,
  ): Promise<void> {
    await this.trackEvent(
      'sync',
      operation,
      success ? 'success' : 'failure',
      duration,
      {
        dataSize,
        conflicts: conflicts || 0,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async trackOfflineOperation(
    operation: string,
    entityType: string,
    dataSize: number,
  ): Promise<void> {
    await this.trackEvent(
      'interaction',
      `offline_${operation}`,
      entityType,
      dataSize,
      {
        offline: true,
        timestamp: new Date().toISOString(),
      },
    );

    if (this.currentSession) {
      this.currentSession.dataModified += dataSize;
    }
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  private startSession() {
    this.currentSession = {
      id: this.sessionId,
      startTime: Date.now(),
      eventsCount: 0,
      dataModified: 0,
      conflictsEncountered: 0,
      syncSuccess: false,
      deviceInfo: {
        type: this.detectDeviceType(),
        browser: this.detectBrowser(),
        connectionType: this.getConnectionType(),
      },
    };

    // Track session start
    this.trackEvent('navigation', 'session_start');
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration =
      this.currentSession.endTime - this.currentSession.startTime;

    // Track session end
    await this.trackEvent(
      'navigation',
      'session_end',
      undefined,
      this.currentSession.duration,
    );

    // Store session
    await offlineDB.saveToIndexedDB({
      storeName: 'analytics_sessions',
      data: this.currentSession,
      id: this.currentSession.id,
    });

    // Sync remaining events
    await this.syncAllEvents();
  }

  // =====================================================
  // PERFORMANCE MONITORING
  // =====================================================

  private setupPerformanceMonitoring() {
    if (typeof PerformanceObserver === 'undefined') return;

    // Monitor navigation timing
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          this.trackPerformance({
            name: 'page_load',
            value: nav.loadEventEnd - nav.fetchStart,
            unit: 'ms',
            timestamp: Date.now(),
          });
        } else if (entry.entryType === 'measure') {
          this.trackPerformance({
            name: entry.name,
            value: entry.duration,
            unit: 'ms',
            timestamp: Date.now(),
          });
        }
      }
    });

    this.performanceObserver.observe({
      entryTypes: ['navigation', 'measure', 'resource'],
    });
  }

  measureOperation(name: string, fn: () => any): any {
    const startMark = `${name}_start`;
    const endMark = `${name}_end`;

    performance.mark(startMark);
    const result = fn();
    performance.mark(endMark);

    performance.measure(name, startMark, endMark);

    return result;
  }

  async measureAsyncOperation(
    name: string,
    fn: () => Promise<any>,
  ): Promise<any> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      await this.trackPerformance({
        name,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await this.trackEvent('error', name, 'operation_failed', duration, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  // =====================================================
  // DATA SYNCHRONIZATION
  // =====================================================

  private async storeEvent(event: AnalyticsEvent): Promise<void> {
    await offlineDB.saveToIndexedDB({
      storeName: 'analytics_events',
      data: event,
      id: event.id,
    });
  }

  private async loadPendingEvents(): Promise<void> {
    const events = await offlineDB.getAllFromStore('analytics_events');
    this.eventQueue = events.filter(
      (e: AnalyticsEvent) => e.syncStatus === 'pending',
    );
  }

  private async syncEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    const supabase = createClient();

    try {
      const { error } = await supabase.from('analytics_events').insert(
        events.map((e) => ({
          ...e,
          synced_at: new Date().toISOString(),
        })),
      );

      if (error) throw error;

      // Mark as synced
      for (const event of events) {
        event.syncStatus = 'synced';
        await this.storeEvent(event);
      }

      // Remove from queue
      this.eventQueue = this.eventQueue.filter(
        (e) => !events.find((synced) => synced.id === e.id),
      );
    } catch (error) {
      console.error('[OfflineAnalytics] Sync failed:', error);

      // Mark as failed
      for (const event of events) {
        event.syncStatus = 'failed';
        await this.storeEvent(event);
      }
    }
  }

  async syncAllEvents(): Promise<void> {
    const pendingEvents = this.eventQueue.filter(
      (e) => e.syncStatus === 'pending',
    );

    // Batch sync
    for (let i = 0; i < pendingEvents.length; i += this.syncBatchSize) {
      const batch = pendingEvents.slice(i, i + this.syncBatchSize);
      await this.syncEvents(batch);
    }
  }

  private startPeriodicSync() {
    // Sync every minute when online
    setInterval(async () => {
      if (navigator.onLine) {
        await this.syncAllEvents();
      }
    }, 60000);
  }

  // =====================================================
  // REPORTING AND INSIGHTS
  // =====================================================

  async generateReport(
    startDate: Date,
    endDate: Date,
  ): Promise<AnalyticsReport> {
    const events = await this.getEventsInRange(startDate, endDate);
    const sessions = await this.getSessionsInRange(startDate, endDate);

    // Calculate summary statistics
    const offlineEvents = events.filter((e) => e.isOffline);
    const syncEvents = events.filter((e) => e.category === 'sync');

    // Action frequency analysis
    const actionCounts = new Map<string, number>();
    events.forEach((e) => {
      const count = actionCounts.get(e.action) || 0;
      actionCounts.set(e.action, count + 1);
    });

    const mostCommonActions = Array.from(actionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // Sync performance
    const syncTimes = syncEvents
      .filter((e) => e.value !== undefined)
      .map((e) => e.value!);

    const averageSyncTime =
      syncTimes.length > 0
        ? syncTimes.reduce((a, b) => a + b, 0) / syncTimes.length
        : 0;

    const successfulSyncs = syncEvents.filter(
      (e) => e.label === 'success',
    ).length;
    const syncSuccessRate =
      syncEvents.length > 0 ? (successfulSyncs / syncEvents.length) * 100 : 100;

    // Offline duration analysis
    const offlineDurations = sessions
      .filter((s) => s.duration)
      .map((s) => s.duration!);

    const averageOfflineDuration =
      offlineDurations.length > 0
        ? offlineDurations.reduce((a, b) => a + b, 0) / offlineDurations.length
        : 0;

    // Peak offline hours
    const offlineHours = new Map<number, number>();
    offlineEvents.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      const count = offlineHours.get(hour) || 0;
      offlineHours.set(hour, count + 1);
    });

    const peakOfflineHours = Array.from(offlineHours.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    // Problem area detection
    const errorEvents = events.filter((e) => e.category === 'error');
    const problemAreas = this.identifyProblemAreas(errorEvents);

    // Generate recommendations
    const recommendations = this.generateRecommendations(events, sessions);

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalEvents: events.length,
        offlineEvents: offlineEvents.length,
        offlinePercentage: (offlineEvents.length / events.length) * 100,
        averageOfflineDuration,
        mostCommonActions,
        syncPerformance: {
          averageTime: averageSyncTime,
          successRate: syncSuccessRate,
          dataTransferred: this.calculateDataTransferred(syncEvents),
        },
      },
      insights: {
        peakOfflineHours,
        problemAreas,
        recommendations,
      },
    };
  }

  private async getEventsInRange(
    startDate: Date,
    endDate: Date,
  ): Promise<AnalyticsEvent[]> {
    const allEvents = await offlineDB.getAllFromStore('analytics_events');

    return allEvents.filter(
      (e: AnalyticsEvent) =>
        e.timestamp >= startDate.getTime() && e.timestamp <= endDate.getTime(),
    );
  }

  private async getSessionsInRange(
    startDate: Date,
    endDate: Date,
  ): Promise<OfflineSession[]> {
    const allSessions = await offlineDB.getAllFromStore('analytics_sessions');

    return allSessions.filter(
      (s: OfflineSession) =>
        s.startTime >= startDate.getTime() && s.startTime <= endDate.getTime(),
    );
  }

  private identifyProblemAreas(errorEvents: AnalyticsEvent[]): string[] {
    const problems = new Map<string, number>();

    errorEvents.forEach((e) => {
      const area = e.label || e.action;
      const count = problems.get(area) || 0;
      problems.set(area, count + 1);
    });

    return Array.from(problems.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area]) => area);
  }

  private generateRecommendations(
    events: AnalyticsEvent[],
    sessions: OfflineSession[],
  ): string[] {
    const recommendations: string[] = [];

    // Check sync performance
    const syncEvents = events.filter((e) => e.category === 'sync');
    const failedSyncs = syncEvents.filter((e) => e.label === 'failure');

    if (failedSyncs.length > syncEvents.length * 0.1) {
      recommendations.push(
        'High sync failure rate detected. Consider optimizing conflict resolution.',
      );
    }

    // Check offline duration
    const longOfflineSessions = sessions.filter(
      (s) => s.duration && s.duration > 3600000, // 1 hour
    );

    if (longOfflineSessions.length > sessions.length * 0.3) {
      recommendations.push(
        'Users frequently work offline for extended periods. Enhance offline capabilities.',
      );
    }

    // Check data usage
    const totalDataModified = sessions.reduce(
      (sum, s) => sum + s.dataModified,
      0,
    );
    const avgDataPerSession = totalDataModified / sessions.length;

    if (avgDataPerSession > 1024 * 1024) {
      // 1MB
      recommendations.push(
        'High data usage per session. Consider implementing data compression.',
      );
    }

    // Check conflict rate
    const totalConflicts = sessions.reduce(
      (sum, s) => sum + s.conflictsEncountered,
      0,
    );

    if (totalConflicts > sessions.length * 2) {
      recommendations.push(
        'High conflict rate. Review and optimize conflict resolution strategies.',
      );
    }

    return recommendations;
  }

  private calculateDataTransferred(syncEvents: AnalyticsEvent[]): number {
    return syncEvents.reduce((total, event) => {
      const dataSize = event.metadata?.dataSize || 0;
      return total + dataSize;
    }, 0);
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private setupEventListeners() {
    // Track online/offline transitions
    window.addEventListener('online', () => {
      this.trackEvent('network', 'connection_restored');
      if (this.currentSession) {
        this.currentSession.syncSuccess = true;
      }
    });

    window.addEventListener('offline', () => {
      this.trackEvent('network', 'connection_lost');
    });

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('navigation', 'page_hidden');
      } else {
        this.trackEvent('navigation', 'page_visible');
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  private detectDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('safari')) return 'Safari';
    if (userAgent.includes('edge')) return 'Edge';
    return 'Unknown';
  }

  private getConnectionType(): string | undefined {
    if ('connection' in navigator) {
      return (navigator as any).connection?.effectiveType;
    }
    return undefined;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  async getMetrics(): Promise<{
    totalEvents: number;
    pendingSync: number;
    syncedEvents: number;
    failedSync: number;
    currentSessionDuration: number;
  }> {
    const allEvents = await offlineDB.getAllFromStore('analytics_events');
    const pending = allEvents.filter(
      (e: AnalyticsEvent) => e.syncStatus === 'pending',
    );
    const synced = allEvents.filter(
      (e: AnalyticsEvent) => e.syncStatus === 'synced',
    );
    const failed = allEvents.filter(
      (e: AnalyticsEvent) => e.syncStatus === 'failed',
    );

    return {
      totalEvents: allEvents.length,
      pendingSync: pending.length,
      syncedEvents: synced.length,
      failedSync: failed.length,
      currentSessionDuration: this.currentSession
        ? Date.now() - this.currentSession.startTime
        : 0,
    };
  }

  async clearAnalytics(): Promise<void> {
    await offlineDB.clearStore('analytics_events');
    await offlineDB.clearStore('analytics_sessions');
    this.eventQueue = [];
  }
}

// Export singleton instance
export const offlineAnalytics = OfflineAnalyticsService.getInstance();
