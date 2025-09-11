/**
 * Application Metrics Collection and Monitoring
 * Tracks performance, business KPIs, and system health
 */

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface HistogramBucket {
  le: number; // less than or equal to
  count: number;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, Metric[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  private constructor() {
    // Start periodic metrics export
    this.startMetricsExport();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Counter: Cumulative metric that only increases
  incrementCounter(
    name: string,
    value: number = 1,
    tags?: Record<string, string>,
  ): void {
    const key = this.getMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.recordMetric({
      name,
      value: current + value,
      unit: 'count',
      timestamp: new Date(),
      tags,
    });
  }

  // Gauge: Metric that can go up or down
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, value);

    this.recordMetric({
      name,
      value,
      unit: 'gauge',
      timestamp: new Date(),
      tags,
    });
  }

  // Histogram: Distribution of values
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const key = this.getMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    this.recordMetric({
      name,
      value,
      unit: 'histogram',
      timestamp: new Date(),
      tags,
    });
  }

  // Timer: Measure duration of operations
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.recordHistogram(`${name}.duration`, duration, tags);

      // Also record as a metric
      this.recordMetric({
        name: `${name}.duration`,
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        tags,
      });
    };
  }

  // Record custom metric
  private recordMetric(metric: Metric): void {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);

    // Keep only last 1000 metrics per name to prevent memory leak
    if (metrics.length > 1000) {
      metrics.shift();
    }

    this.metrics.set(metric.name, metrics);
  }

  // Get metric key with tags
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}{${tagString}}`;
  }

  // Calculate percentiles for histograms
  getPercentiles(
    name: string,
    percentiles: number[] = [50, 90, 95, 99],
  ): Record<string, number> {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) {
      return {};
    }

    const sorted = [...values].sort((a, b) => a - b);
    const result: Record<string, number> = {};

    percentiles.forEach((p) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });

    return result;
  }

  // Get all metrics for export
  getMetrics(): {
    counters: Array<{ name: string; value: number }>;
    gauges: Array<{ name: string; value: number }>;
    histograms: Array<{ name: string; percentiles: Record<string, number> }>;
  } {
    const counters = Array.from(this.counters.entries()).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );

    const gauges = Array.from(this.gauges.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    const histograms = Array.from(this.histograms.keys()).map((name) => ({
      name,
      percentiles: this.getPercentiles(name),
    }));

    return { counters, gauges, histograms };
  }

  // Export metrics periodically
  private startMetricsExport(): void {
    setInterval(() => {
      this.exportMetrics();
    }, 60000); // Export every minute
  }

  private async exportMetrics(): Promise<void> {
    try {
      const metrics = this.getMetrics();

      // Log metrics (in production, send to monitoring service)
      if (process.env.NODE_ENV === 'production') {
        // Send to monitoring service (e.g., Datadog, New Relic, CloudWatch)
        await this.sendToMonitoringService(metrics);
      } else {
        // In development, just log
        console.log('📊 Metrics Export:', JSON.stringify(metrics, null, 2));
      }
    } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  }

  private async sendToMonitoringService(metrics: any): Promise<void> {
    // Implement integration with your monitoring service
    // Example: Datadog, New Relic, CloudWatch, etc.

    if (process.env.DATADOG_API_KEY) {
      // Send to Datadog
      await fetch('https://api.datadoghq.com/api/v1/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY,
        },
        body: JSON.stringify({
          series: this.formatForDatadog(metrics),
        }),
      });
    }
  }

  private formatForDatadog(metrics: any): any[] {
    const series: any[] = [];
    const now = Math.floor(Date.now() / 1000);

    // Format counters
    metrics.counters.forEach((counter: any) => {
      series.push({
        metric: `wedsync.${counter.name}`,
        points: [[now, counter.value]],
        type: 'count',
      });
    });

    // Format gauges
    metrics.gauges.forEach((gauge: any) => {
      series.push({
        metric: `wedsync.${gauge.name}`,
        points: [[now, gauge.value]],
        type: 'gauge',
      });
    });

    // Format histograms
    metrics.histograms.forEach((histogram: any) => {
      Object.entries(histogram.percentiles).forEach(([percentile, value]) => {
        series.push({
          metric: `wedsync.${histogram.name}.${percentile}`,
          points: [[now, value]],
          type: 'gauge',
        });
      });
    });

    return series;
  }

  // Reset all metrics (useful for testing)
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

// Global metrics instance
export const metrics = MetricsCollector.getInstance();

// Business KPI tracking functions
export const trackBusinessMetrics = {
  pdfProcessed: (
    pageCount: number,
    processingTime: number,
    success: boolean,
  ) => {
    metrics.incrementCounter('pdf.processed', 1, {
      status: success ? 'success' : 'failure',
    });
    metrics.recordHistogram('pdf.processing_time', processingTime, {
      pages: String(pageCount),
    });
    metrics.recordHistogram('pdf.pages', pageCount);
  },

  formCreated: (fieldCount: number, source: 'manual' | 'pdf' | 'template') => {
    metrics.incrementCounter('forms.created', 1, { source });
    metrics.recordHistogram('forms.field_count', fieldCount);
  },

  paymentProcessed: (amount: number, currency: string, success: boolean) => {
    metrics.incrementCounter('payments.processed', 1, {
      status: success ? 'success' : 'failure',
      currency,
    });
    if (success) {
      metrics.recordHistogram('payments.amount', amount, { currency });
    }
  },

  apiRequest: (
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
  ) => {
    metrics.incrementCounter('api.requests', 1, {
      endpoint,
      method,
      status: String(statusCode),
    });
    metrics.recordHistogram('api.response_time', duration, {
      endpoint,
      method,
    });

    // Track error rate
    if (statusCode >= 400) {
      metrics.incrementCounter('api.errors', 1, {
        endpoint,
        method,
        status: String(statusCode),
      });
    }
  },

  userActivity: (action: string, userId?: string) => {
    metrics.incrementCounter('user.actions', 1, { action });

    // Track unique active users (approximate)
    if (userId) {
      metrics.setGauge('users.active', Date.now(), { userId });
    }
  },
};
