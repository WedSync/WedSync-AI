/**
 * WS-248: Advanced Search System - Search Analytics Service
 *
 * SearchAnalytics: Search behavior tracking, performance monitoring,
 * and optimization analytics with ML-powered insights.
 *
 * Team B - Round 1 - Advanced Search Backend Focus
 */

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

interface SearchEvent {
  eventType: string;
  sessionId: string;
  userId?: string;
  searchId?: string;
  timestamp?: string;
  properties?: {
    query?: string;
    searchType?: string;
    resultPosition?: number;
    vendorId?: string;
    facetName?: string;
    facetValue?: string;
    deviceInfo?: {
      type: string;
      browser: string;
      os: string;
    };
    location?: {
      latitude: number;
      longitude: number;
      city: string;
      state: string;
    };
  };
}

interface SearchMetric {
  name: string;
  value: number | string;
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  trend?: Array<{
    timestamp: string;
    value: number;
  }>;
  breakdown?: Record<string, number>;
}

interface AnalyticsParams {
  metrics: string[];
  timeRange: {
    start: string;
    end: string;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  filters?: {
    userTypes?: string[];
    searchTypes?: string[];
    locations?: string[];
    vendorTypes?: string[];
    deviceTypes?: string[];
  };
  aggregations?: {
    groupBy?: string[];
    includeComparisons?: boolean;
    includeBreakdowns?: boolean;
  };
}

interface EventTrackingResult {
  processed: number;
  failed: number;
  errors: Array<{
    event: any;
    error: string;
  }>;
}

interface SearchInsight {
  type: 'trend' | 'anomaly' | 'opportunity' | 'alert';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations?: string[];
}

// =====================================================================================
// SEARCH ANALYTICS SERVICE
// =====================================================================================

export class SearchAnalytics {
  private supabase: any;
  private metricsCache: Map<string, any>;
  private eventBuffer: SearchEvent[];
  private batchSize: number;
  private flushInterval: number;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.metricsCache = new Map();
    this.eventBuffer = [];
    this.batchSize = 100;
    this.flushInterval = 30000; // 30 seconds

    // Start batch processing timer
    this.startBatchProcessor();
  }

  // =====================================================================================
  // EVENT TRACKING
  // =====================================================================================

  async trackEvents(events: SearchEvent[]): Promise<EventTrackingResult> {
    const result: EventTrackingResult = {
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Validate and process events
      for (const event of events) {
        try {
          const validatedEvent = this.validateEvent(event);
          this.eventBuffer.push(validatedEvent);
          result.processed++;

          // Flush buffer if it's getting full
          if (this.eventBuffer.length >= this.batchSize) {
            await this.flushEventBuffer();
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            event,
            error: error.message,
          });
        }
      }

      return result;
    } catch (error) {
      console.error('Event tracking error:', error);
      return {
        processed: 0,
        failed: events.length,
        errors: events.map((event) => ({ event, error: error.message })),
      };
    }
  }

  async recordSearch(searchData: {
    searchId: string;
    userId: string;
    query: string;
    searchType: string;
    filters: any;
    location?: any;
    resultCount: number;
    executionTime: number;
  }): Promise<void> {
    try {
      // Store core search record
      await this.supabase.from('search_analytics').insert({
        search_id: searchData.searchId,
        user_id: searchData.userId,
        search_query: searchData.query,
        search_type: searchData.searchType,
        filters_applied: searchData.filters,
        search_location: searchData.location,
        result_count: searchData.resultCount,
        execution_time_ms: searchData.executionTime,
        search_timestamp: new Date().toISOString(),
      });

      // Record query popularity
      await this.updateQueryPopularity(searchData.query);

      // Update real-time metrics
      await this.updateRealTimeMetrics(searchData);
    } catch (error) {
      console.error('Record search error:', error);
    }
  }

  // =====================================================================================
  // METRICS GENERATION
  // =====================================================================================

  async generateMetrics(params: AnalyticsParams): Promise<SearchMetric[]> {
    const metrics: SearchMetric[] = [];

    try {
      for (const metricName of params.metrics) {
        let metric: SearchMetric | null = null;

        switch (metricName) {
          case 'search_volume':
            metric = await this.generateSearchVolumeMetric(params);
            break;

          case 'popular_queries':
            metric = await this.generatePopularQueriesMetric(params);
            break;

          case 'click_through_rates':
            metric = await this.generateClickThroughRateMetric(params);
            break;

          case 'conversion_rates':
            metric = await this.generateConversionRateMetric(params);
            break;

          case 'user_engagement':
            metric = await this.generateUserEngagementMetric(params);
            break;

          case 'performance_metrics':
            metric = await this.generatePerformanceMetric(params);
            break;

          case 'facet_usage':
            metric = await this.generateFacetUsageMetric(params);
            break;

          case 'geographic_trends':
            metric = await this.generateGeographicTrendsMetric(params);
            break;

          case 'vendor_discovery_patterns':
            metric = await this.generateVendorDiscoveryMetric(params);
            break;

          case 'search_funnel_analysis':
            metric = await this.generateSearchFunnelMetric(params);
            break;
        }

        if (metric) {
          metrics.push(metric);
        }
      }

      return metrics;
    } catch (error) {
      console.error('Metrics generation error:', error);
      return [];
    }
  }

  // =====================================================================================
  // INDIVIDUAL METRIC GENERATORS
  // =====================================================================================

  private async generateSearchVolumeMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      let query = this.supabase
        .from('search_analytics')
        .select('search_timestamp', { count: 'exact' })
        .gte('search_timestamp', params.timeRange.start)
        .lte('search_timestamp', params.timeRange.end);

      // Apply filters
      query = this.applyFilters(query, params.filters);

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      // Generate trend data
      const trend = await this.generateTrendData(
        'search_analytics',
        'search_timestamp',
        params.timeRange,
        'COUNT(*)',
      );

      // Calculate change from previous period
      const change = await this.calculatePeriodChange(
        'search_analytics',
        'search_timestamp',
        params.timeRange,
        'COUNT(*)',
      );

      return {
        name: 'search_volume',
        value: count || 0,
        change,
        trend,
      };
    } catch (error) {
      console.error('Search volume metric error:', error);
      return { name: 'search_volume', value: 0 };
    }
  }

  private async generatePopularQueriesMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      let query = this.supabase
        .from('search_analytics')
        .select('search_query')
        .gte('search_timestamp', params.timeRange.start)
        .lte('search_timestamp', params.timeRange.end);

      query = this.applyFilters(query, params.filters);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Count query frequencies
      const queryFrequency =
        data?.reduce(
          (acc, item) => {
            const query = item.search_query.toLowerCase().trim();
            acc[query] = (acc[query] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      // Get top queries
      const topQueries = Object.entries(queryFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .reduce(
          (acc, [query, count]) => {
            acc[query] = count;
            return acc;
          },
          {} as Record<string, number>,
        );

      const mostPopular = Object.keys(topQueries)[0] || 'No queries';

      return {
        name: 'popular_queries',
        value: mostPopular,
        breakdown: topQueries,
      };
    } catch (error) {
      console.error('Popular queries metric error:', error);
      return { name: 'popular_queries', value: 'Error' };
    }
  }

  private async generateClickThroughRateMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      const { data: ctrData, error } = await this.supabase.rpc(
        'calculate_search_ctr_analytics',
        {
          start_date: params.timeRange.start,
          end_date: params.timeRange.end,
          filters: params.filters || {},
        },
      );

      if (error) {
        throw error;
      }

      const averageCTR = ctrData?.[0]?.average_ctr || 0;

      // Generate trend data
      const trend = await this.generateTrendData(
        'search_click_events',
        'created_at',
        params.timeRange,
        'AVG(CASE WHEN clicked THEN 1.0 ELSE 0.0 END)',
      );

      return {
        name: 'click_through_rates',
        value: `${(averageCTR * 100).toFixed(2)}%`,
        trend,
      };
    } catch (error) {
      console.error('CTR metric error:', error);
      return { name: 'click_through_rates', value: '0.00%' };
    }
  }

  private async generateConversionRateMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      const { data: conversionData, error } = await this.supabase.rpc(
        'calculate_search_conversion_analytics',
        {
          start_date: params.timeRange.start,
          end_date: params.timeRange.end,
          filters: params.filters || {},
        },
      );

      if (error) {
        throw error;
      }

      const conversionRate = conversionData?.[0]?.conversion_rate || 0;

      // Get conversion breakdown by vendor type
      const breakdown = await this.generateConversionBreakdown(params);

      return {
        name: 'conversion_rates',
        value: `${(conversionRate * 100).toFixed(2)}%`,
        breakdown,
      };
    } catch (error) {
      console.error('Conversion rate metric error:', error);
      return { name: 'conversion_rates', value: '0.00%' };
    }
  }

  private async generateUserEngagementMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      const { data: engagementData, error } = await this.supabase.rpc(
        'calculate_user_engagement_analytics',
        {
          start_date: params.timeRange.start,
          end_date: params.timeRange.end,
        },
      );

      if (error) {
        throw error;
      }

      const avgSessionDuration = engagementData?.[0]?.avg_session_duration || 0;
      const avgPagesPerSession =
        engagementData?.[0]?.avg_pages_per_session || 0;
      const bounceRate = engagementData?.[0]?.bounce_rate || 0;

      return {
        name: 'user_engagement',
        value: `${Math.round(avgSessionDuration)} seconds`,
        breakdown: {
          'Average Session Duration': Math.round(avgSessionDuration),
          'Pages Per Session': Math.round(avgPagesPerSession * 100) / 100,
          'Bounce Rate': Math.round(bounceRate * 100) / 100,
        },
      };
    } catch (error) {
      console.error('User engagement metric error:', error);
      return { name: 'user_engagement', value: '0 seconds' };
    }
  }

  private async generatePerformanceMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      let query = this.supabase
        .from('search_analytics')
        .select('execution_time_ms')
        .gte('search_timestamp', params.timeRange.start)
        .lte('search_timestamp', params.timeRange.end);

      query = this.applyFilters(query, params.filters);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const executionTimes = data?.map((item) => item.execution_time_ms) || [];

      if (executionTimes.length === 0) {
        return { name: 'performance_metrics', value: '0ms' };
      }

      const avgExecutionTime =
        executionTimes.reduce((sum, time) => sum + time, 0) /
        executionTimes.length;
      const p95ExecutionTime = this.calculatePercentile(executionTimes, 95);

      return {
        name: 'performance_metrics',
        value: `${Math.round(avgExecutionTime)}ms avg`,
        breakdown: {
          'Average Response Time': Math.round(avgExecutionTime),
          'P95 Response Time': Math.round(p95ExecutionTime),
          'P99 Response Time': Math.round(
            this.calculatePercentile(executionTimes, 99),
          ),
        },
      };
    } catch (error) {
      console.error('Performance metric error:', error);
      return { name: 'performance_metrics', value: '0ms' };
    }
  }

  private async generateFacetUsageMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      const { data: facetData, error } = await this.supabase
        .from('search_facet_events')
        .select('facet_name, facet_value')
        .gte('created_at', params.timeRange.start)
        .lte('created_at', params.timeRange.end);

      if (error) {
        throw error;
      }

      const facetUsage =
        facetData?.reduce(
          (acc, item) => {
            const facetName = item.facet_name;
            acc[facetName] = (acc[facetName] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const mostUsedFacet =
        Object.keys(facetUsage).sort(
          (a, b) => facetUsage[b] - facetUsage[a],
        )[0] || 'None';

      return {
        name: 'facet_usage',
        value: mostUsedFacet,
        breakdown: facetUsage,
      };
    } catch (error) {
      console.error('Facet usage metric error:', error);
      return { name: 'facet_usage', value: 'None' };
    }
  }

  private async generateGeographicTrendsMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      const { data: geoData, error } = await this.supabase
        .from('search_analytics')
        .select('search_location')
        .gte('search_timestamp', params.timeRange.start)
        .lte('search_timestamp', params.timeRange.end)
        .not('search_location', 'is', null);

      if (error) {
        throw error;
      }

      const locationCounts =
        geoData?.reduce(
          (acc, item) => {
            if (item.search_location?.city && item.search_location?.state) {
              const location = `${item.search_location.city}, ${item.search_location.state}`;
              acc[location] = (acc[location] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const topLocation =
        Object.keys(locationCounts).sort(
          (a, b) => locationCounts[b] - locationCounts[a],
        )[0] || 'Unknown';

      return {
        name: 'geographic_trends',
        value: topLocation,
        breakdown: locationCounts,
      };
    } catch (error) {
      console.error('Geographic trends metric error:', error);
      return { name: 'geographic_trends', value: 'Unknown' };
    }
  }

  private async generateVendorDiscoveryMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      const { data: discoveryData, error } = await this.supabase
        .from('search_result_clicks')
        .select('vendor_type, discovered_through')
        .gte('created_at', params.timeRange.start)
        .lte('created_at', params.timeRange.end);

      if (error) {
        throw error;
      }

      const discoveryPatterns =
        discoveryData?.reduce(
          (acc, item) => {
            const pattern = `${item.vendor_type} via ${item.discovered_through}`;
            acc[pattern] = (acc[pattern] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const topPattern =
        Object.keys(discoveryPatterns).sort(
          (a, b) => discoveryPatterns[b] - discoveryPatterns[a],
        )[0] || 'None';

      return {
        name: 'vendor_discovery_patterns',
        value: topPattern,
        breakdown: discoveryPatterns,
      };
    } catch (error) {
      console.error('Vendor discovery metric error:', error);
      return { name: 'vendor_discovery_patterns', value: 'None' };
    }
  }

  private async generateSearchFunnelMetric(
    params: AnalyticsParams,
  ): Promise<SearchMetric> {
    try {
      const { data: funnelData, error } = await this.supabase.rpc(
        'calculate_search_funnel_analytics',
        {
          start_date: params.timeRange.start,
          end_date: params.timeRange.end,
        },
      );

      if (error) {
        throw error;
      }

      const funnel = funnelData?.[0] || {};
      const conversionRate = funnel.search_to_contact_rate || 0;

      return {
        name: 'search_funnel_analysis',
        value: `${(conversionRate * 100).toFixed(1)}% conversion`,
        breakdown: {
          Searches: funnel.total_searches || 0,
          Clicks: funnel.total_clicks || 0,
          Contacts: funnel.total_contacts || 0,
          Bookings: funnel.total_bookings || 0,
        },
      };
    } catch (error) {
      console.error('Search funnel metric error:', error);
      return { name: 'search_funnel_analysis', value: '0% conversion' };
    }
  }

  // =====================================================================================
  // INSIGHTS GENERATION
  // =====================================================================================

  async generateInsights(
    metrics: SearchMetric[],
    params: AnalyticsParams,
  ): Promise<SearchInsight[]> {
    const insights: SearchInsight[] = [];

    try {
      // Analyze search volume trends
      const volumeInsights = this.analyzeVolumeInsights(metrics, params);
      insights.push(...volumeInsights);

      // Analyze performance issues
      const performanceInsights = this.analyzePerformanceInsights(
        metrics,
        params,
      );
      insights.push(...performanceInsights);

      // Analyze conversion opportunities
      const conversionInsights = this.analyzeConversionInsights(
        metrics,
        params,
      );
      insights.push(...conversionInsights);

      // Analyze geographic patterns
      const geographicInsights = this.analyzeGeographicInsights(
        metrics,
        params,
      );
      insights.push(...geographicInsights);

      return insights;
    } catch (error) {
      console.error('Insights generation error:', error);
      return [];
    }
  }

  private analyzeVolumeInsights(
    metrics: SearchMetric[],
    params: AnalyticsParams,
  ): SearchInsight[] {
    const insights: SearchInsight[] = [];

    const volumeMetric = metrics.find((m) => m.name === 'search_volume');
    if (!volumeMetric || !volumeMetric.change) {
      return insights;
    }

    // Volume spike detection
    if (volumeMetric.change.percentage > 50) {
      insights.push({
        type: 'trend',
        title: 'Search Volume Spike Detected',
        description: `Search volume increased by ${volumeMetric.change.percentage.toFixed(1)}% compared to previous period`,
        severity: 'medium',
        actionable: true,
        recommendations: [
          'Monitor server capacity to handle increased load',
          'Check if any marketing campaigns are driving traffic',
          'Prepare for potential infrastructure scaling needs',
        ],
      });
    }

    // Volume drop alert
    if (volumeMetric.change.percentage < -30) {
      insights.push({
        type: 'alert',
        title: 'Significant Drop in Search Volume',
        description: `Search volume decreased by ${Math.abs(volumeMetric.change.percentage).toFixed(1)}%`,
        severity: 'high',
        actionable: true,
        recommendations: [
          'Check for technical issues affecting search functionality',
          'Review recent changes that might impact user experience',
          'Analyze marketing campaign performance',
        ],
      });
    }

    return insights;
  }

  private analyzePerformanceInsights(
    metrics: SearchMetric[],
    params: AnalyticsParams,
  ): SearchInsight[] {
    const insights: SearchInsight[] = [];

    const performanceMetric = metrics.find(
      (m) => m.name === 'performance_metrics',
    );
    if (!performanceMetric?.breakdown) {
      return insights;
    }

    const avgResponseTime = performanceMetric.breakdown[
      'Average Response Time'
    ] as number;
    const p95ResponseTime = performanceMetric.breakdown[
      'P95 Response Time'
    ] as number;

    // Slow performance alert
    if (avgResponseTime > 2000) {
      // 2 seconds
      insights.push({
        type: 'alert',
        title: 'Slow Search Performance Detected',
        description: `Average search response time is ${avgResponseTime}ms, which exceeds recommended thresholds`,
        severity: 'high',
        actionable: true,
        recommendations: [
          'Optimize database queries and indexes',
          'Consider implementing search result caching',
          'Review Elasticsearch configuration if applicable',
          'Monitor database connection pool usage',
        ],
      });
    }

    // Performance variability
    if (p95ResponseTime > avgResponseTime * 3) {
      insights.push({
        type: 'opportunity',
        title: 'High Performance Variability',
        description:
          'Some searches are significantly slower than average, indicating optimization opportunities',
        severity: 'medium',
        actionable: true,
        recommendations: [
          'Identify slow query patterns',
          'Implement query-specific optimizations',
          'Consider request timeout policies',
        ],
      });
    }

    return insights;
  }

  private analyzeConversionInsights(
    metrics: SearchMetric[],
    params: AnalyticsParams,
  ): SearchInsight[] {
    const insights: SearchInsight[] = [];

    const conversionMetric = metrics.find((m) => m.name === 'conversion_rates');
    const ctrMetric = metrics.find((m) => m.name === 'click_through_rates');

    if (!conversionMetric || !ctrMetric) {
      return insights;
    }

    const conversionRate = parseFloat(
      conversionMetric.value.toString().replace('%', ''),
    );
    const clickThroughRate = parseFloat(
      ctrMetric.value.toString().replace('%', ''),
    );

    // Low conversion rate opportunity
    if (conversionRate < 2.0) {
      insights.push({
        type: 'opportunity',
        title: 'Low Search Conversion Rate',
        description: `Current conversion rate of ${conversionRate}% is below industry benchmarks`,
        severity: 'medium',
        actionable: true,
        recommendations: [
          'Improve search result relevance and ranking',
          'Enhance vendor profile quality and completeness',
          'Optimize call-to-action placement and messaging',
          'A/B test different result presentation formats',
        ],
      });
    }

    // CTR vs Conversion mismatch
    if (clickThroughRate > 10 && conversionRate < 5) {
      insights.push({
        type: 'opportunity',
        title: 'High CTR, Low Conversion Gap',
        description:
          'Users are clicking results but not converting, indicating a relevance or expectation mismatch',
        severity: 'medium',
        actionable: true,
        recommendations: [
          'Review search result accuracy and vendor quality',
          'Improve vendor profile information and pricing transparency',
          'Optimize the vendor contact and booking process',
        ],
      });
    }

    return insights;
  }

  private analyzeGeographicInsights(
    metrics: SearchMetric[],
    params: AnalyticsParams,
  ): SearchInsight[] {
    const insights: SearchInsight[] = [];

    const geoMetric = metrics.find((m) => m.name === 'geographic_trends');
    if (!geoMetric?.breakdown) {
      return insights;
    }

    const locations = Object.entries(geoMetric.breakdown)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);

    if (locations.length > 0) {
      const topLocation = locations[0];
      const topLocationPercentage =
        ((topLocation[1] as number) /
          Object.values(geoMetric.breakdown).reduce(
            (sum, count) => sum + (count as number),
            0,
          )) *
        100;

      if (topLocationPercentage > 40) {
        insights.push({
          type: 'trend',
          title: 'Geographic Search Concentration',
          description: `${topLocationPercentage.toFixed(1)}% of searches come from ${topLocation[0]}`,
          severity: 'low',
          actionable: true,
          recommendations: [
            'Consider targeted marketing in other geographic areas',
            'Analyze vendor coverage in high-traffic locations',
            'Optimize location-based search results',
          ],
        });
      }
    }

    return insights;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private validateEvent(event: SearchEvent): SearchEvent {
    if (!event.eventType || !event.sessionId) {
      throw new Error('Missing required event fields');
    }

    return {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = [...this.eventBuffer];
      this.eventBuffer = [];

      // Store events in batches
      const batchSize = 50;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);

        await this.supabase.from('search_events').insert(
          batch.map((event) => ({
            event_type: event.eventType,
            session_id: event.sessionId,
            user_id: event.userId,
            search_id: event.searchId,
            event_properties: event.properties,
            timestamp: event.timestamp,
          })),
        );
      }
    } catch (error) {
      console.error('Event buffer flush error:', error);
      // Re-add events to buffer for retry (with limit to prevent infinite growth)
      if (this.eventBuffer.length < this.batchSize * 2) {
        this.eventBuffer.unshift(...this.eventBuffer);
      }
    }
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      this.flushEventBuffer().catch((error) => {
        console.error('Batch processor error:', error);
      });
    }, this.flushInterval);
  }

  private async updateQueryPopularity(query: string): Promise<void> {
    try {
      await this.supabase.from('popular_search_terms').upsert(
        {
          term: query.toLowerCase().trim(),
          search_count: 1,
        },
        {
          onConflict: 'term',
          ignoreDuplicates: false,
        },
      );
    } catch (error) {
      console.error('Query popularity update error:', error);
    }
  }

  private async updateRealTimeMetrics(searchData: any): Promise<void> {
    try {
      const now = new Date();
      const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;

      await this.supabase.from('search_metrics_realtime').upsert(
        {
          time_key: hourKey,
          search_count: 1,
          total_execution_time: searchData.executionTime,
          total_results: searchData.resultCount,
        },
        {
          onConflict: 'time_key',
          ignoreDuplicates: false,
        },
      );
    } catch (error) {
      console.error('Real-time metrics update error:', error);
    }
  }

  private applyFilters(query: any, filters?: any): any {
    if (!filters) return query;

    if (filters.userTypes?.length) {
      query = query.in('user_type', filters.userTypes);
    }

    if (filters.searchTypes?.length) {
      query = query.in('search_type', filters.searchTypes);
    }

    if (filters.deviceTypes?.length) {
      query = query.in('device_type', filters.deviceTypes);
    }

    return query;
  }

  private async generateTrendData(
    tableName: string,
    timestampColumn: string,
    timeRange: any,
    aggregateFunction: string,
  ): Promise<Array<{ timestamp: string; value: number }>> {
    try {
      const { data, error } = await this.supabase.rpc(
        'generate_time_series_analytics',
        {
          table_name: tableName,
          timestamp_column: timestampColumn,
          start_date: timeRange.start,
          end_date: timeRange.end,
          granularity: timeRange.granularity,
          aggregate_function: aggregateFunction,
        },
      );

      if (error) {
        throw error;
      }

      return (
        data?.map((item: any) => ({
          timestamp: item.time_bucket,
          value: parseFloat(item.value) || 0,
        })) || []
      );
    } catch (error) {
      console.error('Trend data generation error:', error);
      return [];
    }
  }

  private async calculatePeriodChange(
    tableName: string,
    timestampColumn: string,
    timeRange: any,
    aggregateFunction: string,
  ): Promise<{
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  }> {
    try {
      const { data, error } = await this.supabase.rpc(
        'calculate_period_change_analytics',
        {
          table_name: tableName,
          timestamp_column: timestampColumn,
          current_start: timeRange.start,
          current_end: timeRange.end,
          aggregate_function: aggregateFunction,
        },
      );

      if (error) {
        throw error;
      }

      const currentValue = data?.[0]?.current_value || 0;
      const previousValue = data?.[0]?.previous_value || 0;
      const change = currentValue - previousValue;
      const percentage = previousValue > 0 ? (change / previousValue) * 100 : 0;

      return {
        value: change,
        percentage,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      };
    } catch (error) {
      console.error('Period change calculation error:', error);
      return { value: 0, percentage: 0, direction: 'stable' };
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private async generateConversionBreakdown(
    params: AnalyticsParams,
  ): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_conversion_breakdown_analytics',
        {
          start_date: params.timeRange.start,
          end_date: params.timeRange.end,
        },
      );

      if (error) {
        throw error;
      }

      return (
        data?.reduce((acc: Record<string, number>, item: any) => {
          acc[item.vendor_type] = item.conversion_rate;
          return acc;
        }, {}) || {}
      );
    } catch (error) {
      console.error('Conversion breakdown error:', error);
      return {};
    }
  }

  // =====================================================================================
  // CLEANUP AND MAINTENANCE
  // =====================================================================================

  async cleanup(): Promise<void> {
    // Flush any remaining events
    await this.flushEventBuffer();

    // Clear cache
    this.metricsCache.clear();
  }

  async archiveOldData(cutoffDate: string): Promise<void> {
    try {
      // Archive old analytics data to reduce query performance impact
      await this.supabase.rpc('archive_old_analytics_data', {
        cutoff_date: cutoffDate,
      });

      console.log(`Analytics data archived for dates before ${cutoffDate}`);
    } catch (error) {
      console.error('Data archival error:', error);
    }
  }
}
