import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

interface SearchEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  query: string;
  location?: string;
  filters: {
    vendorType?: string[];
    priceRange?: { min?: number; max?: number };
    rating?: number;
    distance?: number;
  };
  results: {
    count: number;
    displayedCount: number;
    topVendorIds: string[];
  };
  performance: {
    queryTime: number;
    renderTime: number;
    totalTime: number;
  };
  userAgent: string;
  source: 'web' | 'mobile' | 'voice';
}

interface ClickEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  searchEventId: string;
  vendorId: string;
  vendorName: string;
  position: number;        // Position in search results (1-indexed)
  resultPage: number;      // Which page of results
  clickType: 'profile_view' | 'contact_click' | 'phone_click' | 'email_click' | 'website_click';
}

interface ConversionEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  searchEventId: string;
  clickEventId: string;
  vendorId: string;
  conversionType: 'inquiry_sent' | 'booking_requested' | 'phone_call' | 'email_sent';
  value?: number;          // Estimated conversion value
}

interface SearchAnalyticsMetrics {
  totalSearches: number;
  uniqueUsers: number;
  avgResultsPerSearch: number;
  avgQueryTime: number;
  clickThroughRate: number;
  conversionRate: number;
  bounceRate: number;      // Searches with no clicks
  topQueries: Array<{ query: string; count: number }>;
  topClickedVendors: Array<{ vendorId: string; clicks: number }>;
  performanceMetrics: {
    p50QueryTime: number;
    p90QueryTime: number;
    p95QueryTime: number;
  };
}

interface SearchAnalyticsQuery {
  startDate: Date;
  endDate: Date;
  vendorType?: string;
  location?: string;
  userSegment?: 'new' | 'returning' | 'all';
  source?: 'web' | 'mobile' | 'voice';
}

// Mock analytics service
class SearchAnalyticsService {
  private searchEvents: SearchEvent[] = [];
  private clickEvents: ClickEvent[] = [];
  private conversionEvents: ConversionEvent[] = [];
  private sessionStorage = new Map<string, { searches: number; clicks: number; conversions: number }>();

  // Track search event
  async trackSearchEvent(event: Omit<SearchEvent, 'id' | 'timestamp'>): Promise<string> {
    const searchEvent: SearchEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event
    };

    this.searchEvents.push(searchEvent);
    
    // Update session metrics
    const session = this.sessionStorage.get(event.sessionId) || { searches: 0, clicks: 0, conversions: 0 };
    session.searches++;
    this.sessionStorage.set(event.sessionId, session);

    return searchEvent.id;
  }

  // Track click event
  async trackClickEvent(event: Omit<ClickEvent, 'id' | 'timestamp'>): Promise<string> {
    const clickEvent: ClickEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event
    };

    this.clickEvents.push(clickEvent);

    // Update session metrics
    const session = this.sessionStorage.get(event.sessionId) || { searches: 0, clicks: 0, conversions: 0 };
    session.clicks++;
    this.sessionStorage.set(event.sessionId, session);

    return clickEvent.id;
  }

  // Track conversion event
  async trackConversionEvent(event: Omit<ConversionEvent, 'id' | 'timestamp'>): Promise<string> {
    const conversionEvent: ConversionEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event
    };

    this.conversionEvents.push(conversionEvent);

    // Update session metrics
    const session = this.sessionStorage.get(event.sessionId) || { searches: 0, clicks: 0, conversions: 0 };
    session.conversions++;
    this.sessionStorage.set(event.sessionId, session);

    return conversionEvent.id;
  }

  // Get analytics metrics
  async getSearchAnalytics(query: SearchAnalyticsQuery): Promise<SearchAnalyticsMetrics> {
    const filteredSearches = this.searchEvents.filter(event => 
      event.timestamp >= query.startDate && 
      event.timestamp <= query.endDate &&
      (!query.vendorType || event.filters.vendorType?.includes(query.vendorType)) &&
      (!query.location || event.location === query.location) &&
      (!query.source || event.source === query.source)
    );

    const searchIds = new Set(filteredSearches.map(s => s.id));
    const filteredClicks = this.clickEvents.filter(click => 
      searchIds.has(click.searchEventId)
    );

    const clickIds = new Set(filteredClicks.map(c => c.id));
    const filteredConversions = this.conversionEvents.filter(conv => 
      clickIds.has(conv.clickEventId)
    );

    // Calculate metrics
    const totalSearches = filteredSearches.length;
    const uniqueUsers = new Set(filteredSearches.map(s => s.userId).filter(Boolean)).size;
    const totalClicks = filteredClicks.length;
    const totalConversions = filteredConversions.length;

    const avgResultsPerSearch = filteredSearches.length > 0 
      ? filteredSearches.reduce((sum, s) => sum + s.results.count, 0) / filteredSearches.length 
      : 0;

    const avgQueryTime = filteredSearches.length > 0
      ? filteredSearches.reduce((sum, s) => sum + s.performance.queryTime, 0) / filteredSearches.length
      : 0;

    const clickThroughRate = totalSearches > 0 ? totalClicks / totalSearches : 0;
    const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;

    // Calculate bounce rate (searches with no clicks)
    const searchesWithClicks = new Set(filteredClicks.map(c => c.searchEventId));
    const bounceRate = totalSearches > 0 
      ? (totalSearches - searchesWithClicks.size) / totalSearches 
      : 0;

    // Top queries
    const queryCount = new Map<string, number>();
    filteredSearches.forEach(search => {
      const count = queryCount.get(search.query) || 0;
      queryCount.set(search.query, count + 1);
    });
    const topQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top clicked vendors
    const vendorClickCount = new Map<string, number>();
    filteredClicks.forEach(click => {
      const count = vendorClickCount.get(click.vendorId) || 0;
      vendorClickCount.set(click.vendorId, count + 1);
    });
    const topClickedVendors = Array.from(vendorClickCount.entries())
      .map(([vendorId, clicks]) => ({ vendorId, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Performance metrics
    const queryTimes = filteredSearches.map(s => s.performance.queryTime).sort((a, b) => a - b);
    const p50QueryTime = queryTimes[Math.floor(queryTimes.length * 0.5)] || 0;
    const p90QueryTime = queryTimes[Math.floor(queryTimes.length * 0.9)] || 0;
    const p95QueryTime = queryTimes[Math.floor(queryTimes.length * 0.95)] || 0;

    return {
      totalSearches,
      uniqueUsers,
      avgResultsPerSearch,
      avgQueryTime,
      clickThroughRate,
      conversionRate,
      bounceRate,
      topQueries,
      topClickedVendors,
      performanceMetrics: {
        p50QueryTime,
        p90QueryTime,
        p95QueryTime
      }
    };
  }

  // Get search funnel metrics
  async getSearchFunnelMetrics(query: SearchAnalyticsQuery): Promise<{
    searches: number;
    clicks: number;
    conversions: number;
    searchToClickRate: number;
    clickToConversionRate: number;
    overallConversionRate: number;
  }> {
    const analytics = await this.getSearchAnalytics(query);
    
    const totalSearches = analytics.totalSearches;
    const totalClicks = analytics.topClickedVendors.reduce((sum, vendor) => sum + vendor.clicks, 0);
    
    const filteredConversions = this.conversionEvents.filter(conv => 
      conv.timestamp >= query.startDate && conv.timestamp <= query.endDate
    );
    const totalConversions = filteredConversions.length;

    return {
      searches: totalSearches,
      clicks: totalClicks,
      conversions: totalConversions,
      searchToClickRate: totalSearches > 0 ? totalClicks / totalSearches : 0,
      clickToConversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0,
      overallConversionRate: totalSearches > 0 ? totalConversions / totalSearches : 0
    };
  }

  // Get user behavior analytics
  async getUserBehaviorMetrics(query: SearchAnalyticsQuery): Promise<{
    avgSearchesPerSession: number;
    avgClicksPerSession: number;
    avgSessionDuration: number;
    returnUserRate: number;
    searchRefinementRate: number;
  }> {
    const sessions = new Map<string, { searches: SearchEvent[]; clicks: ClickEvent[]; firstEvent: Date; lastEvent: Date }>();

    // Group events by session
    this.searchEvents.forEach(search => {
      if (!sessions.has(search.sessionId)) {
        sessions.set(search.sessionId, { searches: [], clicks: [], firstEvent: search.timestamp, lastEvent: search.timestamp });
      }
      const session = sessions.get(search.sessionId)!;
      session.searches.push(search);
      if (search.timestamp < session.firstEvent) session.firstEvent = search.timestamp;
      if (search.timestamp > session.lastEvent) session.lastEvent = search.timestamp;
    });

    this.clickEvents.forEach(click => {
      if (sessions.has(click.sessionId)) {
        const session = sessions.get(click.sessionId)!;
        session.clicks.push(click);
        if (click.timestamp > session.lastEvent) session.lastEvent = click.timestamp;
      }
    });

    const sessionData = Array.from(sessions.values()).filter(session => 
      session.firstEvent >= query.startDate && session.firstEvent <= query.endDate
    );

    const avgSearchesPerSession = sessionData.length > 0 
      ? sessionData.reduce((sum, session) => sum + session.searches.length, 0) / sessionData.length 
      : 0;

    const avgClicksPerSession = sessionData.length > 0
      ? sessionData.reduce((sum, session) => sum + session.clicks.length, 0) / sessionData.length
      : 0;

    const avgSessionDuration = sessionData.length > 0
      ? sessionData.reduce((sum, session) => 
          sum + (session.lastEvent.getTime() - session.firstEvent.getTime()), 0) / sessionData.length / 1000
      : 0;

    // Mock return user rate (would need user tracking)
    const returnUserRate = 0.35; // 35% typical return rate

    // Search refinement rate (sessions with multiple different searches)
    const refinementSessions = sessionData.filter(session => {
      const uniqueQueries = new Set(session.searches.map(s => s.query));
      return uniqueQueries.size > 1;
    });
    const searchRefinementRate = sessionData.length > 0 
      ? refinementSessions.length / sessionData.length 
      : 0;

    return {
      avgSearchesPerSession,
      avgClicksPerSession,
      avgSessionDuration,
      returnUserRate,
      searchRefinementRate
    };
  }

  // Clear all data (for testing)
  clearAllData(): void {
    this.searchEvents = [];
    this.clickEvents = [];
    this.conversionEvents = [];
    this.sessionStorage.clear();
  }

  private generateId(): string {
    return 'analytics_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }

  // Get raw events for testing
  getSearchEvents(): SearchEvent[] {
    return [...this.searchEvents];
  }

  getClickEvents(): ClickEvent[] {
    return [...this.clickEvents];
  }

  getConversionEvents(): ConversionEvent[] {
    return [...this.conversionEvents];
  }
}

describe('WS-248: Advanced Search System - Search Analytics Tests', () => {
  let analyticsService: SearchAnalyticsService;
  const testStartDate = new Date('2024-01-01');
  const testEndDate = new Date('2024-01-31');

  beforeEach(() => {
    analyticsService = new SearchAnalyticsService();
  });

  afterEach(() => {
    analyticsService.clearAllData();
  });

  describe('Event Tracking', () => {
    test('should track search events correctly', async () => {
      const searchEventId = await analyticsService.trackSearchEvent({
        sessionId: 'session_1',
        userId: 'user_1',
        query: 'wedding photographer',
        location: 'New York, NY',
        filters: {
          vendorType: ['photographer'],
          priceRange: { min: 1000, max: 5000 }
        },
        results: {
          count: 25,
          displayedCount: 10,
          topVendorIds: ['vendor_1', 'vendor_2', 'vendor_3']
        },
        performance: {
          queryTime: 120,
          renderTime: 50,
          totalTime: 170
        },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      expect(searchEventId).toBeDefined();
      expect(searchEventId).toMatch(/^analytics_/);

      const events = analyticsService.getSearchEvents();
      expect(events).toHaveLength(1);
      expect(events[0].query).toBe('wedding photographer');
      expect(events[0].sessionId).toBe('session_1');
      expect(events[0].userId).toBe('user_1');
    });

    test('should track click events correctly', async () => {
      // First create a search event
      const searchEventId = await analyticsService.trackSearchEvent({
        sessionId: 'session_1',
        query: 'wedding venue',
        filters: {},
        results: { count: 15, displayedCount: 10, topVendorIds: ['venue_1'] },
        performance: { queryTime: 100, renderTime: 30, totalTime: 130 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      // Then track a click
      const clickEventId = await analyticsService.trackClickEvent({
        sessionId: 'session_1',
        searchEventId,
        vendorId: 'venue_1',
        vendorName: 'Grand Ballroom',
        position: 1,
        resultPage: 1,
        clickType: 'profile_view'
      });

      expect(clickEventId).toBeDefined();
      
      const clickEvents = analyticsService.getClickEvents();
      expect(clickEvents).toHaveLength(1);
      expect(clickEvents[0].vendorId).toBe('venue_1');
      expect(clickEvents[0].position).toBe(1);
    });

    test('should track conversion events correctly', async () => {
      // Create search and click events first
      const searchEventId = await analyticsService.trackSearchEvent({
        sessionId: 'session_1',
        query: 'wedding photographer',
        filters: {},
        results: { count: 20, displayedCount: 10, topVendorIds: ['photo_1'] },
        performance: { queryTime: 90, renderTime: 40, totalTime: 130 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const clickEventId = await analyticsService.trackClickEvent({
        sessionId: 'session_1',
        searchEventId,
        vendorId: 'photo_1',
        vendorName: 'Elite Photography',
        position: 2,
        resultPage: 1,
        clickType: 'contact_click'
      });

      // Track conversion
      const conversionEventId = await analyticsService.trackConversionEvent({
        sessionId: 'session_1',
        searchEventId,
        clickEventId,
        vendorId: 'photo_1',
        conversionType: 'inquiry_sent',
        value: 3500
      });

      expect(conversionEventId).toBeDefined();
      
      const conversionEvents = analyticsService.getConversionEvents();
      expect(conversionEvents).toHaveLength(1);
      expect(conversionEvents[0].conversionType).toBe('inquiry_sent');
      expect(conversionEvents[0].value).toBe(3500);
    });

    test('should handle events without user ID', async () => {
      const searchEventId = await analyticsService.trackSearchEvent({
        sessionId: 'anonymous_session',
        query: 'wedding florist',
        filters: {},
        results: { count: 12, displayedCount: 8, topVendorIds: [] },
        performance: { queryTime: 85, renderTime: 25, totalTime: 110 },
        userAgent: 'Mozilla/5.0...',
        source: 'mobile'
      });

      expect(searchEventId).toBeDefined();
      
      const events = analyticsService.getSearchEvents();
      expect(events[0].userId).toBeUndefined();
      expect(events[0].sessionId).toBe('anonymous_session');
    });
  });

  describe('Analytics Metrics Calculation', () => {
    beforeEach(async () => {
      // Create sample data for testing metrics
      const searchEvent1Id = await analyticsService.trackSearchEvent({
        sessionId: 'session_1',
        userId: 'user_1',
        query: 'wedding photographer',
        location: 'New York, NY',
        filters: { vendorType: ['photographer'] },
        results: { count: 25, displayedCount: 10, topVendorIds: ['photo_1', 'photo_2'] },
        performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const searchEvent2Id = await analyticsService.trackSearchEvent({
        sessionId: 'session_2', 
        userId: 'user_2',
        query: 'wedding venue',
        location: 'Los Angeles, CA',
        filters: { vendorType: ['venue'] },
        results: { count: 15, displayedCount: 10, topVendorIds: ['venue_1'] },
        performance: { queryTime: 120, renderTime: 40, totalTime: 160 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      // Add clicks
      await analyticsService.trackClickEvent({
        sessionId: 'session_1',
        searchEventId: searchEvent1Id,
        vendorId: 'photo_1',
        vendorName: 'Elite Photography',
        position: 1,
        resultPage: 1,
        clickType: 'profile_view'
      });

      await analyticsService.trackClickEvent({
        sessionId: 'session_1',
        searchEventId: searchEvent1Id,
        vendorId: 'photo_2',
        vendorName: 'Premium Photos',
        position: 2,
        resultPage: 1,
        clickType: 'contact_click'
      });
    });

    test('should calculate basic search metrics correctly', async () => {
      const metrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(metrics.totalSearches).toBe(2);
      expect(metrics.uniqueUsers).toBe(2);
      expect(metrics.avgResultsPerSearch).toBe(20); // (25 + 15) / 2
      expect(metrics.avgQueryTime).toBe(110); // (100 + 120) / 2
      expect(metrics.clickThroughRate).toBe(1); // 2 clicks / 2 searches
    });

    test('should calculate click-through rates accurately', async () => {
      // Add another search without clicks to test CTR
      await analyticsService.trackSearchEvent({
        sessionId: 'session_3',
        userId: 'user_3',
        query: 'wedding florist',
        filters: {},
        results: { count: 8, displayedCount: 8, topVendorIds: [] },
        performance: { queryTime: 90, renderTime: 30, totalTime: 120 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const metrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(metrics.totalSearches).toBe(3);
      expect(metrics.clickThroughRate).toBeCloseTo(0.667, 2); // 2 clicks / 3 searches
      expect(metrics.bounceRate).toBeCloseTo(0.333, 2); // 1 search without clicks / 3 total
    });

    test('should identify top queries correctly', async () => {
      // Add more searches of same query
      await analyticsService.trackSearchEvent({
        sessionId: 'session_4',
        query: 'wedding photographer',
        filters: {},
        results: { count: 30, displayedCount: 10, topVendorIds: [] },
        performance: { queryTime: 105, renderTime: 35, totalTime: 140 },
        userAgent: 'Mozilla/5.0...',
        source: 'mobile'
      });

      const metrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(metrics.topQueries).toHaveLength(2);
      expect(metrics.topQueries[0].query).toBe('wedding photographer');
      expect(metrics.topQueries[0].count).toBe(2);
      expect(metrics.topQueries[1].query).toBe('wedding venue');
      expect(metrics.topQueries[1].count).toBe(1);
    });

    test('should calculate performance percentiles correctly', async () => {
      // Add more search events with varying query times
      for (let i = 0; i < 10; i++) {
        await analyticsService.trackSearchEvent({
          sessionId: `session_${i + 10}`,
          query: 'test query',
          filters: {},
          results: { count: 10, displayedCount: 10, topVendorIds: [] },
          performance: { queryTime: (i + 1) * 10, renderTime: 30, totalTime: (i + 1) * 10 + 30 },
          userAgent: 'Mozilla/5.0...',
          source: 'web'
        });
      }

      const metrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(metrics.performanceMetrics.p50QueryTime).toBeGreaterThan(0);
      expect(metrics.performanceMetrics.p90QueryTime).toBeGreaterThan(metrics.performanceMetrics.p50QueryTime);
      expect(metrics.performanceMetrics.p95QueryTime).toBeGreaterThan(metrics.performanceMetrics.p90QueryTime);
    });

    test('should filter metrics by vendor type', async () => {
      const photographyMetrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate,
        vendorType: 'photographer'
      });

      const venueMetrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate,
        vendorType: 'venue'
      });

      expect(photographyMetrics.totalSearches).toBe(1);
      expect(venueMetrics.totalSearches).toBe(1);
    });

    test('should filter metrics by location', async () => {
      const nycMetrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate,
        location: 'New York, NY'
      });

      const laMetrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate,
        location: 'Los Angeles, CA'
      });

      expect(nycMetrics.totalSearches).toBe(1);
      expect(laMetrics.totalSearches).toBe(1);
    });

    test('should filter metrics by source', async () => {
      const webMetrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate,
        source: 'web'
      });

      expect(webMetrics.totalSearches).toBe(2);
    });
  });

  describe('Funnel Analysis', () => {
    test('should calculate search funnel metrics correctly', async () => {
      // Create complete funnel
      const searchEventId = await analyticsService.trackSearchEvent({
        sessionId: 'funnel_session',
        query: 'wedding photographer',
        filters: {},
        results: { count: 20, displayedCount: 10, topVendorIds: ['photo_1'] },
        performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const clickEventId = await analyticsService.trackClickEvent({
        sessionId: 'funnel_session',
        searchEventId,
        vendorId: 'photo_1',
        vendorName: 'Test Photography',
        position: 1,
        resultPage: 1,
        clickType: 'profile_view'
      });

      await analyticsService.trackConversionEvent({
        sessionId: 'funnel_session',
        searchEventId,
        clickEventId,
        vendorId: 'photo_1',
        conversionType: 'inquiry_sent'
      });

      const funnelMetrics = await analyticsService.getSearchFunnelMetrics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(funnelMetrics.searches).toBeGreaterThan(0);
      expect(funnelMetrics.clicks).toBeGreaterThan(0);
      expect(funnelMetrics.conversions).toBeGreaterThan(0);
      expect(funnelMetrics.searchToClickRate).toBeGreaterThan(0);
      expect(funnelMetrics.clickToConversionRate).toBeGreaterThan(0);
      expect(funnelMetrics.overallConversionRate).toBeGreaterThan(0);
    });

    test('should handle funnel with no conversions', async () => {
      const searchEventId = await analyticsService.trackSearchEvent({
        sessionId: 'no_conversion_session',
        query: 'wedding venue',
        filters: {},
        results: { count: 15, displayedCount: 10, topVendorIds: ['venue_1'] },
        performance: { queryTime: 110, renderTime: 45, totalTime: 155 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      await analyticsService.trackClickEvent({
        sessionId: 'no_conversion_session',
        searchEventId,
        vendorId: 'venue_1',
        vendorName: 'Test Venue',
        position: 1,
        resultPage: 1,
        clickType: 'profile_view'
      });

      const funnelMetrics = await analyticsService.getSearchFunnelMetrics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(funnelMetrics.searches).toBeGreaterThan(0);
      expect(funnelMetrics.clicks).toBeGreaterThan(0);
      expect(funnelMetrics.searchToClickRate).toBeGreaterThan(0);
    });
  });

  describe('User Behavior Analytics', () => {
    test('should calculate user behavior metrics', async () => {
      // Create multi-search session
      const session1Id = 'behavior_session_1';
      
      await analyticsService.trackSearchEvent({
        sessionId: session1Id,
        userId: 'behavior_user_1',
        query: 'wedding photographer',
        filters: {},
        results: { count: 20, displayedCount: 10, topVendorIds: ['photo_1'] },
        performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      await analyticsService.trackSearchEvent({
        sessionId: session1Id,
        userId: 'behavior_user_1',
        query: 'wedding photographer New York',
        filters: { location: 'New York' },
        results: { count: 12, displayedCount: 10, topVendorIds: ['photo_2'] },
        performance: { queryTime: 95, renderTime: 45, totalTime: 140 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const behaviorMetrics = await analyticsService.getUserBehaviorMetrics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(behaviorMetrics.avgSearchesPerSession).toBeGreaterThan(0);
      expect(behaviorMetrics.searchRefinementRate).toBeGreaterThan(0);
      expect(typeof behaviorMetrics.avgSessionDuration).toBe('number');
      expect(typeof behaviorMetrics.returnUserRate).toBe('number');
    });

    test('should detect search refinement patterns', async () => {
      const refinementSessionId = 'refinement_session';
      
      // Initial broad search
      await analyticsService.trackSearchEvent({
        sessionId: refinementSessionId,
        query: 'wedding photographer',
        filters: {},
        results: { count: 50, displayedCount: 10, topVendorIds: [] },
        performance: { queryTime: 120, renderTime: 60, totalTime: 180 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      // Refined search with location
      await analyticsService.trackSearchEvent({
        sessionId: refinementSessionId,
        query: 'wedding photographer Manhattan',
        filters: { location: 'Manhattan' },
        results: { count: 15, displayedCount: 10, topVendorIds: [] },
        performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      // Further refined with price
      await analyticsService.trackSearchEvent({
        sessionId: refinementSessionId,
        query: 'wedding photographer Manhattan under 4000',
        filters: { location: 'Manhattan', priceRange: { max: 4000 } },
        results: { count: 8, displayedCount: 8, topVendorIds: [] },
        performance: { queryTime: 90, renderTime: 40, totalTime: 130 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const behaviorMetrics = await analyticsService.getUserBehaviorMetrics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(behaviorMetrics.searchRefinementRate).toBe(1); // 100% of sessions had refinements
      expect(behaviorMetrics.avgSearchesPerSession).toBe(3);
    });
  });

  describe('Real-time Analytics', () => {
    test('should track real-time search performance', async () => {
      const startTime = Date.now();
      
      await analyticsService.trackSearchEvent({
        sessionId: 'realtime_session',
        query: 'wedding venue',
        filters: {},
        results: { count: 25, displayedCount: 10, topVendorIds: [] },
        performance: { queryTime: 150, renderTime: 75, totalTime: 225 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const endTime = Date.now();
      const trackingTime = endTime - startTime;

      expect(trackingTime).toBeLessThan(100); // Tracking should be fast
      
      const events = analyticsService.getSearchEvents();
      expect(events).toHaveLength(1);
    });

    test('should handle high-volume concurrent tracking', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(analyticsService.trackSearchEvent({
          sessionId: `concurrent_session_${i}`,
          query: `test query ${i}`,
          filters: {},
          results: { count: 10, displayedCount: 10, topVendorIds: [] },
          performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
          userAgent: 'Mozilla/5.0...',
          source: 'web'
        }));
      }

      const eventIds = await Promise.all(promises);
      
      expect(eventIds).toHaveLength(50);
      expect(new Set(eventIds).size).toBe(50); // All unique IDs
      
      const events = analyticsService.getSearchEvents();
      expect(events).toHaveLength(50);
    });
  });

  describe('Data Quality and Validation', () => {
    test('should validate event timestamps are reasonable', async () => {
      const beforeTracking = new Date();
      
      await analyticsService.trackSearchEvent({
        sessionId: 'timestamp_session',
        query: 'wedding photographer',
        filters: {},
        results: { count: 20, displayedCount: 10, topVendorIds: [] },
        performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const afterTracking = new Date();
      const events = analyticsService.getSearchEvents();
      
      expect(events[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTracking.getTime());
      expect(events[0].timestamp.getTime()).toBeLessThanOrEqual(afterTracking.getTime());
    });

    test('should maintain data consistency across related events', async () => {
      const sessionId = 'consistency_session';
      const userId = 'consistency_user';
      
      const searchEventId = await analyticsService.trackSearchEvent({
        sessionId,
        userId,
        query: 'wedding photographer',
        filters: {},
        results: { count: 20, displayedCount: 10, topVendorIds: ['photo_1'] },
        performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
        userAgent: 'Mozilla/5.0...',
        source: 'web'
      });

      const clickEventId = await analyticsService.trackClickEvent({
        sessionId,
        userId,
        searchEventId,
        vendorId: 'photo_1',
        vendorName: 'Test Photography',
        position: 1,
        resultPage: 1,
        clickType: 'profile_view'
      });

      await analyticsService.trackConversionEvent({
        sessionId,
        userId,
        searchEventId,
        clickEventId,
        vendorId: 'photo_1',
        conversionType: 'inquiry_sent'
      });

      const searchEvents = analyticsService.getSearchEvents();
      const clickEvents = analyticsService.getClickEvents();
      const conversionEvents = analyticsService.getConversionEvents();

      // Verify relationships
      expect(clickEvents[0].searchEventId).toBe(searchEventId);
      expect(conversionEvents[0].searchEventId).toBe(searchEventId);
      expect(conversionEvents[0].clickEventId).toBe(clickEventId);
      
      // Verify consistency
      expect(searchEvents[0].sessionId).toBe(sessionId);
      expect(clickEvents[0].sessionId).toBe(sessionId);
      expect(conversionEvents[0].sessionId).toBe(sessionId);
    });

    test('should handle missing or invalid data gracefully', async () => {
      // Test with minimal required data
      const eventId = await analyticsService.trackSearchEvent({
        sessionId: 'minimal_session',
        query: '',
        filters: {},
        results: { count: 0, displayedCount: 0, topVendorIds: [] },
        performance: { queryTime: 0, renderTime: 0, totalTime: 0 },
        userAgent: '',
        source: 'web'
      });

      expect(eventId).toBeDefined();
      
      const events = analyticsService.getSearchEvents();
      expect(events).toHaveLength(1);
      expect(events[0].query).toBe('');
    });
  });

  describe('Analytics Performance', () => {
    test('should calculate metrics efficiently for large datasets', async () => {
      // Generate large dataset
      for (let i = 0; i < 1000; i++) {
        await analyticsService.trackSearchEvent({
          sessionId: `perf_session_${i}`,
          userId: `user_${i % 100}`,
          query: `query ${i % 10}`,
          filters: { vendorType: ['photographer'] },
          results: { count: 20, displayedCount: 10, topVendorIds: [] },
          performance: { queryTime: 100 + (i % 50), renderTime: 50, totalTime: 150 + (i % 50) },
          userAgent: 'Mozilla/5.0...',
          source: i % 2 === 0 ? 'web' : 'mobile'
        });
      }

      const startTime = Date.now();
      const metrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate
      });
      const calculationTime = Date.now() - startTime;

      expect(calculationTime).toBeLessThan(1000); // Should complete within 1 second
      expect(metrics.totalSearches).toBe(1000);
      expect(metrics.uniqueUsers).toBe(100);
    });

    test('should maintain acceptable memory usage', () => {
      // This test would be more meaningful in a real environment
      // For now, just verify the service can handle multiple operations
      const initialEventCount = analyticsService.getSearchEvents().length;
      
      // Clear and verify cleanup
      analyticsService.clearAllData();
      
      const finalEventCount = analyticsService.getSearchEvents().length;
      expect(finalEventCount).toBe(0);
      expect(finalEventCount).toBeLessThan(initialEventCount);
    });
  });

  describe('Wedding-Specific Analytics', () => {
    test('should track wedding vendor search patterns', async () => {
      const weddingQueries = [
        'wedding photographer',
        'wedding venue',
        'wedding florist',
        'wedding caterer',
        'wedding DJ'
      ];

      for (const query of weddingQueries) {
        await analyticsService.trackSearchEvent({
          sessionId: `wedding_session_${query.split(' ')[1]}`,
          query,
          filters: { vendorType: [query.split(' ')[1]] },
          results: { count: 15, displayedCount: 10, topVendorIds: [] },
          performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
          userAgent: 'Mozilla/5.0...',
          source: 'web'
        });
      }

      const metrics = await analyticsService.getSearchAnalytics({
        startDate: testStartDate,
        endDate: testEndDate
      });

      expect(metrics.topQueries).toHaveLength(5);
      expect(metrics.topQueries.every(q => q.query.includes('wedding'))).toBe(true);
    });

    test('should identify seasonal wedding search trends', async () => {
      // Mock searches across different months
      const months = ['2024-02-01', '2024-05-01', '2024-09-01', '2024-11-01'];
      
      for (const month of months) {
        const timestamp = new Date(month);
        await analyticsService.trackSearchEvent({
          sessionId: `seasonal_${month}`,
          query: 'wedding venue',
          filters: {},
          results: { count: 20, displayedCount: 10, topVendorIds: [] },
          performance: { queryTime: 100, renderTime: 50, totalTime: 150 },
          userAgent: 'Mozilla/5.0...',
          source: 'web'
        });
      }

      // This would be expanded in a real implementation to analyze seasonal patterns
      const metrics = await analyticsService.getSearchAnalytics({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });

      expect(metrics.totalSearches).toBeGreaterThanOrEqual(4);
    });
  });
});