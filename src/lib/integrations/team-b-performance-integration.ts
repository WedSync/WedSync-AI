/**
 * Team B Performance API Integration
 *
 * This module integrates with Team B's performance API endpoints to:
 * 1. Fetch real-time performance metrics
 * 2. Send performance telemetry data
 * 3. Retrieve optimization recommendations
 * 4. Submit performance test results
 */

'use client';

interface TeamBPerformanceMetrics {
  timestamp: string;
  endpoint: string;
  response_time: number;
  throughput: number;
  error_rate: number;
  memory_usage: number;
  cpu_utilization: number;
  database_query_time: number;
  cache_hit_rate: number;
}

interface PerformanceRecommendation {
  id: string;
  category: 'database' | 'caching' | 'rendering' | 'network' | 'memory';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact_score: number;
  implementation_effort: number;
  code_changes?: string[];
}

interface PerformanceTelemetry {
  user_agent: string;
  viewport_size: { width: number; height: number };
  connection_type: string;
  page_load_time: number;
  first_contentful_paint: number;
  largest_contentful_paint: number;
  cumulative_layout_shift: number;
  first_input_delay: number;
  time_to_interactive: number;
  custom_metrics: Record<string, number>;
}

interface PerformanceTestSubmission {
  test_id: string;
  test_name: string;
  environment: 'development' | 'staging' | 'production';
  browser_info: {
    name: string;
    version: string;
    platform: string;
  };
  performance_metrics: {
    render_time: number;
    fps: number;
    memory_usage: number;
    network_requests: number;
  };
  test_results: {
    passed: boolean;
    score: number;
    thresholds_met: string[];
    thresholds_failed: string[];
  };
  timestamp: string;
}

class TeamBPerformanceAPI {
  private baseUrl: string;
  private apiKey: string | null;
  private retryAttempts: number = 3;
  private requestTimeout: number = 10000;

  constructor(baseUrl: string = '/api/team-b/performance', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_TEAM_B_API_KEY || null;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      ...options.headers,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.requestTimeout,
        );

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on 4xx errors
        if (lastError.message.includes('HTTP 4')) {
          break;
        }

        if (attempt < this.retryAttempts - 1) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Fetch current performance metrics from Team B's API
   */
  async getPerformanceMetrics(
    timeRange?: '1h' | '6h' | '24h' | '7d',
  ): Promise<TeamBPerformanceMetrics[]> {
    const params = new URLSearchParams();
    if (timeRange) params.set('range', timeRange);

    return this.makeRequest<TeamBPerformanceMetrics[]>(
      `/metrics?${params.toString()}`,
    );
  }

  /**
   * Get real-time performance status
   */
  async getPerformanceStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    overall_score: number;
    issues: Array<{
      severity: 'high' | 'medium' | 'low';
      message: string;
      affected_endpoints: string[];
    }>;
  }> {
    return this.makeRequest('/status');
  }

  /**
   * Submit performance telemetry data
   */
  async submitTelemetry(
    telemetry: PerformanceTelemetry,
  ): Promise<{ success: boolean; id: string }> {
    return this.makeRequest('/telemetry', {
      method: 'POST',
      body: JSON.stringify(telemetry),
    });
  }

  /**
   * Get performance optimization recommendations
   */
  async getRecommendations(
    category?: 'database' | 'caching' | 'rendering' | 'network' | 'memory',
  ): Promise<PerformanceRecommendation[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);

    return this.makeRequest<PerformanceRecommendation[]>(
      `/recommendations?${params.toString()}`,
    );
  }

  /**
   * Submit performance test results
   */
  async submitTestResults(testResults: PerformanceTestSubmission): Promise<{
    success: boolean;
    report_id: string;
    benchmark_comparison: {
      percentile_rank: number;
      similar_environments: number;
      improvement_suggestions: string[];
    };
  }> {
    return this.makeRequest('/tests/results', {
      method: 'POST',
      body: JSON.stringify(testResults),
    });
  }

  /**
   * Get performance benchmarks for comparison
   */
  async getBenchmarks(
    environment: 'development' | 'staging' | 'production',
  ): Promise<{
    benchmarks: {
      metric: string;
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    }[];
    last_updated: string;
  }> {
    return this.makeRequest(`/benchmarks/${environment}`);
  }

  /**
   * Register for real-time performance alerts
   */
  async subscribeToAlerts(
    webhookUrl: string,
    thresholds: {
      response_time_ms?: number;
      error_rate_percent?: number;
      memory_usage_mb?: number;
      cpu_percent?: number;
    },
  ): Promise<{ success: boolean; subscription_id: string }> {
    return this.makeRequest('/alerts/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        webhook_url: webhookUrl,
        thresholds,
      }),
    });
  }
}

// Global instance
export const teamBPerformanceAPI = new TeamBPerformanceAPI();

// React hooks for Team B performance integration
export function useTeamBPerformanceMetrics(
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h',
) {
  const [metrics, setMetrics] = React.useState<TeamBPerformanceMetrics[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await teamBPerformanceAPI.getPerformanceMetrics(timeRange);
        if (isMounted) {
          setMetrics(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch metrics',
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [timeRange]);

  return { metrics, loading, error, refetch: () => setLoading(true) };
}

export function useTeamBPerformanceStatus() {
  const [status, setStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const data = await teamBPerformanceAPI.getPerformanceStatus();
        if (isMounted) {
          setStatus(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch status',
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Refresh every 15 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { status, loading, error };
}

export function useTeamBRecommendations(category?: string) {
  const [recommendations, setRecommendations] = React.useState<
    PerformanceRecommendation[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const data = await teamBPerformanceAPI.getRecommendations(
          category as any,
        );
        if (isMounted) {
          setRecommendations(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to fetch recommendations',
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, [category]);

  return { recommendations, loading, error };
}

// Utility functions for performance integration
export const PerformanceIntegrationUtils = {
  /**
   * Collect client-side performance telemetry
   */
  collectTelemetry(): PerformanceTelemetry {
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    return {
      user_agent: navigator.userAgent,
      viewport_size: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection_type:
        (navigator as any).connection?.effectiveType || 'unknown',
      page_load_time:
        navigation?.loadEventEnd - navigation?.navigationStart || 0,
      first_contentful_paint:
        paintEntries.find((e) => e.name === 'first-contentful-paint')
          ?.startTime || 0,
      largest_contentful_paint: 0, // Will be populated by observer
      cumulative_layout_shift: 0, // Will be populated by observer
      first_input_delay: 0, // Will be populated by observer
      time_to_interactive:
        navigation?.loadEventEnd - navigation?.navigationStart || 0,
      custom_metrics: {
        dom_ready:
          navigation?.domContentLoadedEventEnd - navigation?.navigationStart ||
          0,
        resource_load_time:
          navigation?.loadEventEnd - navigation?.domContentLoadedEventEnd || 0,
        dns_lookup_time:
          navigation?.domainLookupEnd - navigation?.domainLookupStart || 0,
        tcp_connect_time:
          navigation?.connectEnd - navigation?.connectStart || 0,
      },
    };
  },

  /**
   * Create performance test submission from test results
   */
  createTestSubmission(
    testId: string,
    testName: string,
    results: {
      renderTime: number;
      fps: number;
      memoryUsage: number;
      networkRequests: number;
      score: number;
      passed: boolean;
      thresholdsMet: string[];
      thresholdsFailed: string[];
    },
  ): PerformanceTestSubmission {
    return {
      test_id: testId,
      test_name: testName,
      environment: (process.env.NODE_ENV as any) || 'development',
      browser_info: {
        name: this.getBrowserName(),
        version: this.getBrowserVersion(),
        platform: navigator.platform,
      },
      performance_metrics: {
        render_time: results.renderTime,
        fps: results.fps,
        memory_usage: results.memoryUsage,
        network_requests: results.networkRequests,
      },
      test_results: {
        passed: results.passed,
        score: results.score,
        thresholds_met: results.thresholdsMet,
        thresholds_failed: results.thresholdsFailed,
      },
      timestamp: new Date().toISOString(),
    };
  },

  getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  },

  getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[1] : 'Unknown';
  },

  /**
   * Monitor Team B API performance and automatically submit telemetry
   */
  async startPerformanceMonitoring() {
    const telemetry = this.collectTelemetry();

    // Submit telemetry every 5 minutes
    const submitTelemetry = () => {
      teamBPerformanceAPI.submitTelemetry(telemetry).catch((error) => {
        console.warn('Failed to submit performance telemetry:', error);
      });
    };

    // Submit initial telemetry
    submitTelemetry();

    // Set up periodic submission
    return setInterval(submitTelemetry, 5 * 60 * 1000);
  },
};

export default teamBPerformanceAPI;
