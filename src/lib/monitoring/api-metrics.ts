interface MetricPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

interface ApiMetrics {
  requests: MetricPoint[];
  errors: MetricPoint[];
  latency: MetricPoint[];
  throughput: MetricPoint[];
}

class ApiMetricsCollector {
  private metrics: ApiMetrics = {
    requests: [],
    errors: [],
    latency: [],
    throughput: [],
  };

  recordRequest(
    endpoint: string,
    method: string,
    status: number,
    duration: number,
  ): void {
    const timestamp = new Date();
    const labels = { endpoint, method, status: status.toString() };

    // Record request
    this.metrics.requests.push({
      timestamp,
      value: 1,
      labels,
    });

    // Record error if status >= 400
    if (status >= 400) {
      this.metrics.errors.push({
        timestamp,
        value: 1,
        labels,
      });
    }

    // Record latency
    this.metrics.latency.push({
      timestamp,
      value: duration,
      labels,
    });

    // Calculate throughput (requests per minute)
    this.updateThroughput(timestamp);

    // Clean old metrics (keep last hour)
    this.cleanOldMetrics();
  }

  private updateThroughput(timestamp: Date): void {
    const oneMinuteAgo = new Date(timestamp.getTime() - 60 * 1000);
    const recentRequests = this.metrics.requests.filter(
      (r) => r.timestamp >= oneMinuteAgo,
    );

    this.metrics.throughput.push({
      timestamp,
      value: recentRequests.length,
    });
  }

  private cleanOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    this.metrics.requests = this.metrics.requests.filter(
      (m) => m.timestamp >= oneHourAgo,
    );
    this.metrics.errors = this.metrics.errors.filter(
      (m) => m.timestamp >= oneHourAgo,
    );
    this.metrics.latency = this.metrics.latency.filter(
      (m) => m.timestamp >= oneHourAgo,
    );
    this.metrics.throughput = this.metrics.throughput.filter(
      (m) => m.timestamp >= oneHourAgo,
    );
  }

  getMetrics(): ApiMetrics {
    return this.metrics;
  }

  getAverageLatency(minutes: number = 5): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentLatency = this.metrics.latency.filter(
      (m) => m.timestamp >= cutoff,
    );

    if (recentLatency.length === 0) return 0;

    const sum = recentLatency.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / recentLatency.length);
  }

  getErrorRate(minutes: number = 5): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentRequests = this.metrics.requests.filter(
      (m) => m.timestamp >= cutoff,
    );
    const recentErrors = this.metrics.errors.filter(
      (m) => m.timestamp >= cutoff,
    );

    if (recentRequests.length === 0) return 0;

    return (
      Math.round((recentErrors.length / recentRequests.length) * 100 * 100) /
      100
    );
  }
}

export const apiMetrics = new ApiMetricsCollector();
