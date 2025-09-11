/**
 * WS-038: Navigation Analytics Integration
 * Track navigation patterns, user behavior, and performance metrics
 */

import { NavigationItem, UserProfile } from './roleBasedAccess';

export interface NavigationEvent {
  type:
    | 'page_view'
    | 'click'
    | 'search'
    | 'command_palette'
    | 'breadcrumb'
    | 'mobile_nav'
    | 'quick_action';
  path: string;
  source:
    | 'navigation_bar'
    | 'sidebar'
    | 'mobile_nav'
    | 'command_palette'
    | 'breadcrumb'
    | 'quick_action'
    | 'external';
  timestamp: number;
  userId?: string;
  userRole?: string;
  sessionId: string;
  metadata?: Record<string, any>;
  performance?: {
    loadTime?: number;
    renderTime?: number;
    interactionTime?: number;
  };
}

export interface NavigationMetrics {
  pageViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; views: number; percentage: number }>;
  navigationSources: Array<{
    source: string;
    usage: number;
    percentage: number;
  }>;
  userFlows: Array<{ from: string; to: string; count: number }>;
  searchQueries: Array<{ query: string; count: number; resultClicks: number }>;
  mobileUsage: number;
  accessibilityUsage: number;
}

export interface PerformanceMetrics {
  avgNavigationTime: number;
  slowestPages: Array<{ path: string; avgTime: number }>;
  navigationErrors: number;
  cacheHitRate: number;
  bundleSize: number;
}

class NavigationAnalytics {
  private events: NavigationEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private userRole?: string;
  private startTime: number = Date.now();
  private lastInteraction: number = Date.now();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupPerformanceObserver();
    this.setupUnloadHandler();
  }

  // Initialize with user context
  setUser(userProfile: UserProfile) {
    this.userId = userProfile.id;
    this.userRole = userProfile.role;
  }

  // Track page view
  trackPageView(
    path: string,
    source: NavigationEvent['source'] = 'external',
    metadata?: Record<string, any>,
  ) {
    const event: NavigationEvent = {
      type: 'page_view',
      path,
      source,
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      metadata: {
        ...metadata,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    };

    this.addEvent(event);
    this.updateInteractionTime();
  }

  // Track navigation clicks
  trackClick(
    item: NavigationItem,
    source: NavigationEvent['source'],
    metadata?: Record<string, any>,
  ) {
    const event: NavigationEvent = {
      type: 'click',
      path: item.href,
      source,
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      metadata: {
        ...metadata,
        itemId: item.id,
        itemLabel: item.label,
        hasChildren: !!(item.children && item.children.length > 0),
        isQuickAction: item.quickAction,
        vendorSpecific: item.vendorSpecific,
      },
    };

    this.addEvent(event);
    this.updateInteractionTime();
  }

  // Track search usage
  trackSearch(
    query: string,
    results: NavigationItem[],
    source: NavigationEvent['source'] = 'command_palette',
  ) {
    const event: NavigationEvent = {
      type: 'search',
      path: window.location.pathname,
      source,
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      metadata: {
        query,
        resultCount: results.length,
        results: results.map((r) => ({
          id: r.id,
          label: r.label,
          href: r.href,
        })),
      },
    };

    this.addEvent(event);
    this.updateInteractionTime();
  }

  // Track command palette usage
  trackCommandPalette(
    action: 'open' | 'close' | 'select',
    metadata?: Record<string, any>,
  ) {
    const event: NavigationEvent = {
      type: 'command_palette',
      path: window.location.pathname,
      source: 'command_palette',
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      metadata: {
        action,
        ...metadata,
      },
    };

    this.addEvent(event);
    this.updateInteractionTime();
  }

  // Track breadcrumb usage
  trackBreadcrumb(crumbPath: string, metadata?: Record<string, any>) {
    const event: NavigationEvent = {
      type: 'breadcrumb',
      path: crumbPath,
      source: 'breadcrumb',
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      metadata: {
        currentPath: window.location.pathname,
        ...metadata,
      },
    };

    this.addEvent(event);
    this.updateInteractionTime();
  }

  // Track mobile navigation usage
  trackMobileNav(
    action: 'open' | 'close' | 'swipe',
    metadata?: Record<string, any>,
  ) {
    const event: NavigationEvent = {
      type: 'mobile_nav',
      path: window.location.pathname,
      source: 'mobile_nav',
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      metadata: {
        action,
        isTouchDevice: 'ontouchstart' in window,
        screenSize: {
          width: window.screen.width,
          height: window.screen.height,
        },
        ...metadata,
      },
    };

    this.addEvent(event);
    this.updateInteractionTime();
  }

  // Track quick action usage
  trackQuickAction(action: NavigationItem, metadata?: Record<string, any>) {
    const event: NavigationEvent = {
      type: 'quick_action',
      path: action.href,
      source: 'quick_action',
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      metadata: {
        actionId: action.id,
        actionLabel: action.label,
        ...metadata,
      },
    };

    this.addEvent(event);
    this.updateInteractionTime();
  }

  // Get navigation metrics
  getMetrics(timeRange?: { start: number; end: number }): NavigationMetrics {
    const filteredEvents = this.filterEventsByTimeRange(timeRange);

    return {
      pageViews: this.calculatePageViews(filteredEvents),
      uniqueVisitors: this.calculateUniqueVisitors(filteredEvents),
      avgSessionDuration: this.calculateAvgSessionDuration(filteredEvents),
      topPages: this.calculateTopPages(filteredEvents),
      navigationSources: this.calculateNavigationSources(filteredEvents),
      userFlows: this.calculateUserFlows(filteredEvents),
      searchQueries: this.calculateSearchQueries(filteredEvents),
      mobileUsage: this.calculateMobileUsage(filteredEvents),
      accessibilityUsage: this.calculateAccessibilityUsage(filteredEvents),
    };
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      avgNavigationTime: this.calculateAvgNavigationTime(),
      slowestPages: this.calculateSlowestPages(),
      navigationErrors: this.calculateNavigationErrors(),
      cacheHitRate: this.calculateCacheHitRate(),
      bundleSize: this.calculateBundleSize(),
    };
  }

  // Export analytics data
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      events: this.events,
      metrics: this.getMetrics(),
      performance: this.getPerformanceMetrics(),
      session: {
        id: this.sessionId,
        userId: this.userId,
        userRole: this.userRole,
        startTime: this.startTime,
        duration: Date.now() - this.startTime,
      },
    };

    if (format === 'csv') {
      return this.convertToCSV(data.events);
    }

    return JSON.stringify(data, null, 2);
  }

  // Send analytics to backend
  async sendAnalytics(endpoint: string = '/api/analytics/navigation') {
    try {
      const payload = {
        events: this.events,
        sessionId: this.sessionId,
        userId: this.userId,
        userRole: this.userRole,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Clear sent events
        this.events = [];
      }

      return response.ok;
    } catch (error) {
      console.error('Failed to send analytics:', error);
      return false;
    }
  }

  // Private methods
  private addEvent(event: NavigationEvent) {
    this.events.push(event);

    // Limit memory usage
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }

    // Auto-send periodically
    if (this.events.length % 10 === 0) {
      this.sendAnalytics().catch(console.error);
    }
  }

  private updateInteractionTime() {
    this.lastInteraction = Date.now();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              // Track page load performance
              const navEntry = entry as PerformanceNavigationTiming;
              this.trackPageLoadPerformance(navEntry);
            }
          }
        });

        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  private trackPageLoadPerformance(entry: PerformanceNavigationTiming) {
    const performanceEvent: NavigationEvent = {
      type: 'page_view',
      path: window.location.pathname,
      source: 'external',
      timestamp: Date.now(),
      userId: this.userId,
      userRole: this.userRole,
      sessionId: this.sessionId,
      performance: {
        loadTime: entry.loadEventEnd - entry.loadEventStart,
        renderTime:
          entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
        interactionTime: entry.loadEventEnd - entry.fetchStart,
      },
    };

    this.addEvent(performanceEvent);
  }

  private setupUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      // Send remaining analytics
      navigator.sendBeacon(
        '/api/analytics/navigation',
        JSON.stringify({
          events: this.events,
          sessionId: this.sessionId,
          userId: this.userId,
          userRole: this.userRole,
          sessionDuration: Date.now() - this.startTime,
        }),
      );
    });
  }

  private filterEventsByTimeRange(timeRange?: { start: number; end: number }) {
    if (!timeRange) return this.events;

    return this.events.filter(
      (event) =>
        event.timestamp >= timeRange.start && event.timestamp <= timeRange.end,
    );
  }

  private calculatePageViews(events: NavigationEvent[]): number {
    return events.filter((e) => e.type === 'page_view').length;
  }

  private calculateUniqueVisitors(events: NavigationEvent[]): number {
    const uniqueUsers = new Set(events.map((e) => e.userId).filter(Boolean));
    return uniqueUsers.size;
  }

  private calculateAvgSessionDuration(events: NavigationEvent[]): number {
    // Implementation would calculate session durations
    return (Date.now() - this.startTime) / 1000; // seconds
  }

  private calculateTopPages(
    events: NavigationEvent[],
  ): Array<{ path: string; views: number; percentage: number }> {
    const pageViews = events.filter((e) => e.type === 'page_view');
    const pathCounts = pageViews.reduce(
      (acc, event) => {
        acc[event.path] = (acc[event.path] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = pageViews.length;
    return Object.entries(pathCounts)
      .map(([path, views]) => ({
        path,
        views,
        percentage: (views / total) * 100,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private calculateNavigationSources(
    events: NavigationEvent[],
  ): Array<{ source: string; usage: number; percentage: number }> {
    const sourceCounts = events.reduce(
      (acc, event) => {
        acc[event.source] = (acc[event.source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = events.length;
    return Object.entries(sourceCounts)
      .map(([source, usage]) => ({
        source,
        usage,
        percentage: (usage / total) * 100,
      }))
      .sort((a, b) => b.usage - a.usage);
  }

  private calculateUserFlows(
    events: NavigationEvent[],
  ): Array<{ from: string; to: string; count: number }> {
    const flows: Record<string, number> = {};
    const pageViews = events
      .filter((e) => e.type === 'page_view')
      .sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < pageViews.length; i++) {
      const from = pageViews[i - 1].path;
      const to = pageViews[i].path;
      const key = `${from} -> ${to}`;
      flows[key] = (flows[key] || 0) + 1;
    }

    return Object.entries(flows)
      .map(([flow, count]) => {
        const [from, to] = flow.split(' -> ');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private calculateSearchQueries(
    events: NavigationEvent[],
  ): Array<{ query: string; count: number; resultClicks: number }> {
    const searchEvents = events.filter((e) => e.type === 'search');
    const queryCounts: Record<string, { count: number; resultClicks: number }> =
      {};

    searchEvents.forEach((event) => {
      const query = event.metadata?.query || '';
      if (!queryCounts[query]) {
        queryCounts[query] = { count: 0, resultClicks: 0 };
      }
      queryCounts[query].count++;
      // You would track result clicks separately
    });

    return Object.entries(queryCounts)
      .map(([query, data]) => ({ query, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private calculateMobileUsage(events: NavigationEvent[]): number {
    const mobileEvents = events.filter((e) => e.type === 'mobile_nav');
    return mobileEvents.length;
  }

  private calculateAccessibilityUsage(events: NavigationEvent[]): number {
    // Track keyboard navigation, screen reader usage, etc.
    return 0; // Placeholder
  }

  private calculateAvgNavigationTime(): number {
    const navigationEvents = this.events.filter(
      (e) => e.performance?.interactionTime,
    );
    const totalTime = navigationEvents.reduce(
      (sum, e) => sum + (e.performance?.interactionTime || 0),
      0,
    );
    return navigationEvents.length ? totalTime / navigationEvents.length : 0;
  }

  private calculateSlowestPages(): Array<{ path: string; avgTime: number }> {
    // Implementation would calculate average load times per page
    return [];
  }

  private calculateNavigationErrors(): number {
    // Track 404s, failed navigations, etc.
    return 0;
  }

  private calculateCacheHitRate(): number {
    // Track cache performance
    return 0;
  }

  private calculateBundleSize(): number {
    // Track JavaScript bundle size impact
    return 0;
  }

  private convertToCSV(events: NavigationEvent[]): string {
    const headers = [
      'timestamp',
      'type',
      'path',
      'source',
      'userId',
      'userRole',
      'sessionId',
    ];
    const rows = events.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.type,
      event.path,
      event.source,
      event.userId || '',
      event.userRole || '',
      event.sessionId,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

// Export singleton instance
export const navigationAnalytics = new NavigationAnalytics();

// React hook for analytics
export function useNavigationAnalytics() {
  const trackPageView = (
    path: string,
    source?: NavigationEvent['source'],
    metadata?: Record<string, any>,
  ) => {
    navigationAnalytics.trackPageView(path, source, metadata);
  };

  const trackClick = (
    item: NavigationItem,
    source: NavigationEvent['source'],
    metadata?: Record<string, any>,
  ) => {
    navigationAnalytics.trackClick(item, source, metadata);
  };

  const trackSearch = (
    query: string,
    results: NavigationItem[],
    source?: NavigationEvent['source'],
  ) => {
    navigationAnalytics.trackSearch(query, results, source);
  };

  const trackCommandPalette = (
    action: 'open' | 'close' | 'select',
    metadata?: Record<string, any>,
  ) => {
    navigationAnalytics.trackCommandPalette(action, metadata);
  };

  const trackBreadcrumb = (
    crumbPath: string,
    metadata?: Record<string, any>,
  ) => {
    navigationAnalytics.trackBreadcrumb(crumbPath, metadata);
  };

  const trackMobileNav = (
    action: 'open' | 'close' | 'swipe',
    metadata?: Record<string, any>,
  ) => {
    navigationAnalytics.trackMobileNav(action, metadata);
  };

  const trackQuickAction = (
    action: NavigationItem,
    metadata?: Record<string, any>,
  ) => {
    navigationAnalytics.trackQuickAction(action, metadata);
  };

  return {
    trackPageView,
    trackClick,
    trackSearch,
    trackCommandPalette,
    trackBreadcrumb,
    trackMobileNav,
    trackQuickAction,
    getMetrics: () => navigationAnalytics.getMetrics(),
    getPerformanceMetrics: () => navigationAnalytics.getPerformanceMetrics(),
    exportData: (format?: 'json' | 'csv') =>
      navigationAnalytics.exportData(format),
  };
}
