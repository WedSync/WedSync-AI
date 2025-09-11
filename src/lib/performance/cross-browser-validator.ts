/**
 * WS-173: Cross-Browser Performance Validation System
 * Ensures performance consistency across all supported browsers
 */

interface BrowserPerformanceMetrics {
  browser: string;
  version: string;
  engine: string;
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  bundleLoadTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  timestamp: number;
}

interface CrossBrowserReport {
  testId: string;
  timestamp: number;
  browsers: BrowserPerformanceMetrics[];
  consistencyScore: number;
  issues: BrowserCompatibilityIssue[];
  recommendations: string[];
}

interface BrowserCompatibilityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  browser: string;
  metric: string;
  description: string;
  deviation: number;
  impact: string;
}

export class CrossBrowserPerformanceValidator {
  private supportedBrowsers = [
    { name: 'Chrome', minVersion: 88 },
    { name: 'Firefox', minVersion: 78 },
    { name: 'Safari', minVersion: 14 },
    { name: 'Edge', minVersion: 88 },
  ];

  private performanceThresholds = {
    lcp: { target: 4000, variance: 0.2 }, // 20% variance allowed
    fid: { target: 100, variance: 0.3 },
    cls: { target: 0.1, variance: 0.5 },
    fcp: { target: 2500, variance: 0.2 },
    ttfb: { target: 800, variance: 0.25 },
  };

  /**
   * Detect current browser and collect performance metrics
   */
  async collectBrowserMetrics(): Promise<BrowserPerformanceMetrics | null> {
    try {
      const browserInfo = this.detectBrowser();
      if (!browserInfo) {
        console.warn('Browser not supported for performance validation');
        return null;
      }

      // Collect Core Web Vitals and performance metrics
      const metrics = await this.measurePerformanceMetrics();

      return {
        browser: browserInfo.name,
        version: browserInfo.version,
        engine: browserInfo.engine,
        ...metrics,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Failed to collect browser metrics:', error);
      return null;
    }
  }

  /**
   * Validate performance across multiple browser sessions
   */
  async validateCrossBrowserPerformance(
    browserMetrics: BrowserPerformanceMetrics[],
  ): Promise<CrossBrowserReport> {
    const testId = `cross_browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(browserMetrics);

    // Identify compatibility issues
    const issues = this.identifyCompatibilityIssues(browserMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      browserMetrics,
      issues,
    );

    const report: CrossBrowserReport = {
      testId,
      timestamp: Date.now(),
      browsers: browserMetrics,
      consistencyScore,
      issues,
      recommendations,
    };

    // Log report for monitoring
    console.log('📊 Cross-Browser Performance Report:', report);

    return report;
  }

  /**
   * Real-time cross-browser monitoring
   */
  startCrossBrowserMonitoring(
    onReport: (report: CrossBrowserReport) => void,
    interval: number = 300000, // 5 minutes
  ): () => void {
    const metrics: BrowserPerformanceMetrics[] = [];

    const collectMetrics = async () => {
      const browserMetrics = await this.collectBrowserMetrics();
      if (browserMetrics) {
        metrics.push(browserMetrics);

        // Keep last 10 measurements per browser
        const browserGroups = this.groupMetricsByBrowser(metrics);
        const trimmedMetrics: BrowserPerformanceMetrics[] = [];

        Object.values(browserGroups).forEach((browserMetrics) => {
          trimmedMetrics.push(...browserMetrics.slice(-10));
        });

        metrics.splice(0, metrics.length, ...trimmedMetrics);

        // Generate report if we have metrics from multiple browsers or enough data
        if (metrics.length >= 3) {
          const report = await this.validateCrossBrowserPerformance(metrics);
          onReport(report);
        }
      }
    };

    // Initial collection
    collectMetrics();

    // Set up interval
    const intervalId = setInterval(collectMetrics, interval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Check if current browser meets minimum requirements
   */
  checkBrowserCompatibility(): {
    supported: boolean;
    browser: string;
    version: string;
    issues: string[];
    recommendations: string[];
  } {
    const browserInfo = this.detectBrowser();
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!browserInfo) {
      return {
        supported: false,
        browser: 'Unknown',
        version: 'Unknown',
        issues: ['Browser not recognized'],
        recommendations: [
          'Please use a supported browser: Chrome 88+, Firefox 78+, Safari 14+, or Edge 88+',
        ],
      };
    }

    const supportedBrowser = this.supportedBrowsers.find(
      (b) => b.name.toLowerCase() === browserInfo.name.toLowerCase(),
    );

    if (!supportedBrowser) {
      issues.push(`Browser ${browserInfo.name} is not officially supported`);
      recommendations.push(
        'Switch to a supported browser for optimal performance',
      );
    } else if (
      this.parseVersion(browserInfo.version) < supportedBrowser.minVersion
    ) {
      issues.push(
        `Browser version ${browserInfo.version} is below minimum required ${supportedBrowser.minVersion}`,
      );
      recommendations.push(
        `Update ${browserInfo.name} to version ${supportedBrowser.minVersion} or higher`,
      );
    }

    // Check for specific feature support
    if (!this.checkFeatureSupport()) {
      issues.push('Missing required browser features for optimal performance');
      recommendations.push(
        'Enable JavaScript and update browser for best experience',
      );
    }

    return {
      supported: issues.length === 0,
      browser: browserInfo.name,
      version: browserInfo.version,
      issues,
      recommendations,
    };
  }

  /**
   * Private helper methods
   */

  private detectBrowser(): {
    name: string;
    version: string;
    engine: string;
  } | null {
    const userAgent = navigator.userAgent;

    // Chrome
    if (/Chrome\/([0-9\.]+)/.test(userAgent) && !/Edg\//.test(userAgent)) {
      const version = userAgent.match(/Chrome\/([0-9\.]+)/)?.[1] || 'unknown';
      return { name: 'Chrome', version, engine: 'Blink' };
    }

    // Firefox
    if (/Firefox\/([0-9\.]+)/.test(userAgent)) {
      const version = userAgent.match(/Firefox\/([0-9\.]+)/)?.[1] || 'unknown';
      return { name: 'Firefox', version, engine: 'Gecko' };
    }

    // Safari
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
      const version = userAgent.match(/Version\/([0-9\.]+)/)?.[1] || 'unknown';
      return { name: 'Safari', version, engine: 'WebKit' };
    }

    // Edge
    if (/Edg\/([0-9\.]+)/.test(userAgent)) {
      const version = userAgent.match(/Edg\/([0-9\.]+)/)?.[1] || 'unknown';
      return { name: 'Edge', version, engine: 'Blink' };
    }

    return null;
  }

  private async measurePerformanceMetrics(): Promise<
    Omit<
      BrowserPerformanceMetrics,
      'browser' | 'version' | 'engine' | 'timestamp'
    >
  > {
    const metrics = {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0,
      ttfb: 0,
      bundleLoadTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
    };

    // Measure Core Web Vitals using Performance API
    if ('PerformanceObserver' in window) {
      await this.measureWebVitals(metrics);
    }

    // Measure TTFB
    const navigationTiming = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      metrics.ttfb =
        navigationTiming.responseStart - navigationTiming.requestStart;
    }

    // Measure bundle load time
    const resourceTiming = performance.getEntriesByType('resource');
    const jsResources = resourceTiming.filter((r) => r.name.includes('.js'));
    if (jsResources.length > 0) {
      metrics.bundleLoadTime = Math.max(
        ...jsResources.map((r) => r.loadEventEnd - r.startTime),
      );
    }

    // Measure memory usage
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      metrics.memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
    }

    return metrics;
  }

  private async measureWebVitals(metrics: any): Promise<void> {
    return new Promise((resolve) => {
      let measuredMetrics = 0;
      const totalMetrics = 3; // LCP, FID, CLS

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            metrics.lcp = entry.startTime;
            measuredMetrics++;
          } else if (entry.entryType === 'first-input') {
            metrics.fid = (entry as any).processingStart - entry.startTime;
            measuredMetrics++;
          } else if (entry.entryType === 'layout-shift') {
            if (!(entry as any).hadRecentInput) {
              metrics.cls += (entry as any).value;
              measuredMetrics++;
            }
          } else if (
            entry.entryType === 'paint' &&
            entry.name === 'first-contentful-paint'
          ) {
            metrics.fcp = entry.startTime;
          }

          if (measuredMetrics >= totalMetrics) {
            observer.disconnect();
            resolve();
          }
        }
      });

      try {
        observer.observe({
          entryTypes: [
            'largest-contentful-paint',
            'first-input',
            'layout-shift',
            'paint',
          ],
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 10000);
      } catch (error) {
        console.warn('Performance observer error:', error);
        resolve();
      }
    });
  }

  private calculateConsistencyScore(
    browserMetrics: BrowserPerformanceMetrics[],
  ): number {
    if (browserMetrics.length < 2) return 100;

    const metrics = ['lcp', 'fid', 'cls', 'fcp', 'ttfb'];
    let totalConsistency = 0;

    metrics.forEach((metric) => {
      const values = browserMetrics
        .map((b) => (b as any)[metric])
        .filter((v) => v > 0);
      if (values.length < 2) return;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / mean;

      // Lower coefficient of variation = higher consistency
      const consistency = Math.max(0, 100 - coefficientOfVariation * 100);
      totalConsistency += consistency;
    });

    return Math.round(totalConsistency / metrics.length);
  }

  private identifyCompatibilityIssues(
    browserMetrics: BrowserPerformanceMetrics[],
  ): BrowserCompatibilityIssue[] {
    const issues: BrowserCompatibilityIssue[] = [];

    if (browserMetrics.length < 2) return issues;

    const metricKeys = ['lcp', 'fid', 'cls', 'fcp', 'ttfb'] as const;

    metricKeys.forEach((metric) => {
      const values = browserMetrics.map((b) => ({
        browser: b.browser,
        value: (b as any)[metric],
      }));
      const validValues = values.filter((v) => v.value > 0);

      if (validValues.length < 2) return;

      const mean =
        validValues.reduce((a, b) => a + b.value, 0) / validValues.length;
      const threshold =
        this.performanceThresholds[
          metric as keyof typeof this.performanceThresholds
        ];

      validValues.forEach(({ browser, value }) => {
        const deviation = Math.abs(value - mean) / mean;

        if (deviation > threshold.variance) {
          const severity = this.determineSeverity(
            deviation,
            value,
            threshold.target,
          );

          issues.push({
            severity,
            browser,
            metric,
            description: `${metric.toUpperCase()} performance significantly different from other browsers`,
            deviation: Math.round(deviation * 100),
            impact: this.getImpactDescription(metric, value, threshold.target),
          });
        }
      });
    });

    return issues;
  }

  private generateRecommendations(
    browserMetrics: BrowserPerformanceMetrics[],
    issues: BrowserCompatibilityIssue[],
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations
    if (issues.length === 0) {
      recommendations.push(
        'Performance is consistent across all tested browsers',
      );
    } else {
      recommendations.push(
        'Address browser-specific performance issues for better consistency',
      );
    }

    // Browser-specific recommendations
    const browserIssues = this.groupIssuesByBrowser(issues);

    Object.entries(browserIssues).forEach(([browser, browserIssuesList]) => {
      if (browserIssuesList.some((i) => i.metric === 'lcp')) {
        recommendations.push(
          `Optimize image loading and critical resources for ${browser}`,
        );
      }
      if (browserIssuesList.some((i) => i.metric === 'fid')) {
        recommendations.push(`Reduce JavaScript execution time for ${browser}`);
      }
      if (browserIssuesList.some((i) => i.metric === 'cls')) {
        recommendations.push(`Fix layout stability issues in ${browser}`);
      }
    });

    // Metric-specific recommendations
    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        'Priority: Address critical performance issues immediately',
      );
    }

    return recommendations;
  }

  private groupMetricsByBrowser(
    metrics: BrowserPerformanceMetrics[],
  ): Record<string, BrowserPerformanceMetrics[]> {
    return metrics.reduce(
      (acc, metric) => {
        const key = `${metric.browser}_${metric.version}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(metric);
        return acc;
      },
      {} as Record<string, BrowserPerformanceMetrics[]>,
    );
  }

  private groupIssuesByBrowser(
    issues: BrowserCompatibilityIssue[],
  ): Record<string, BrowserCompatibilityIssue[]> {
    return issues.reduce(
      (acc, issue) => {
        if (!acc[issue.browser]) acc[issue.browser] = [];
        acc[issue.browser].push(issue);
        return acc;
      },
      {} as Record<string, BrowserCompatibilityIssue[]>,
    );
  }

  private determineSeverity(
    deviation: number,
    value: number,
    target: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (value > target * 2) return 'critical';
    if (value > target * 1.5) return 'high';
    if (deviation > 0.5) return 'medium';
    return 'low';
  }

  private getImpactDescription(
    metric: string,
    value: number,
    target: number,
  ): string {
    const ratio = value / target;
    if (ratio > 2) return 'Severely impacts user experience';
    if (ratio > 1.5) return 'Significantly impacts user experience';
    if (ratio > 1.2) return 'Moderately impacts user experience';
    return 'Minor impact on user experience';
  }

  private parseVersion(version: string): number {
    return parseInt(version.split('.')[0], 10);
  }

  private checkFeatureSupport(): boolean {
    return (
      'PerformanceObserver' in window &&
      'IntersectionObserver' in window &&
      'requestAnimationFrame' in window &&
      'localStorage' in window &&
      'sessionStorage' in window
    );
  }
}

// Export singleton instance
export const crossBrowserValidator =
  typeof window !== 'undefined' ? new CrossBrowserPerformanceValidator() : null;
