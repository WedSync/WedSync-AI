import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';

interface PerformanceMetrics {
  renderTime: number;
  dataProcessingTime: number;
  interactionLatency: number;
  memoryUsage: number;
  bundleSize: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

interface BenchmarkResult {
  component: string;
  testCase: string;
  metrics: PerformanceMetrics;
  passed: boolean;
  thresholds: Record<string, number>;
}

class ChartPerformanceBenchmark {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private results: BenchmarkResult[] = [];

  async setup() {
    this.browser = await chromium.launch({
      args: [
        '--enable-precise-memory-info',
        '--enable-web-memory-api',
        '--memory-pressure-off'
      ]
    });
    
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    
    // Enable performance metrics collection
    await this.page.addInitScript(() => {
      // Add performance observer for detailed metrics
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as any).performanceEntries = (window as any).performanceEntries || [];
            (window as any).performanceEntries.push({
              name: entry.name,
              type: entry.entryType,
              startTime: entry.startTime,
              duration: entry.duration,
              ...(entry as any)
            });
          }
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });
      }
    });
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();  
    if (this.browser) await this.browser.close();
  }

  async measureChartRenderPerformance(
    url: string, 
    chartSelector: string, 
    component: string,
    testCase: string = 'default'
  ): Promise<BenchmarkResult> {
    if (!this.page) throw new Error('Page not initialized');

    const startTime = Date.now();
    
    // Navigate and wait for chart to load
    await this.page.goto(url);
    
    // Wait for chart container to be visible
    await this.page.waitForSelector(chartSelector, { timeout: 10000 });
    
    // Measure chart rendering time
    const renderTime = await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const start = performance.now();
        const observer = new MutationObserver(() => {
          const charts = document.querySelectorAll('canvas, svg[class*="recharts"]');
          if (charts.length > 0) {
            const allRendered = Array.from(charts).every(chart => {
              const rect = chart.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
            
            if (allRendered) {
              observer.disconnect();
              resolve(performance.now() - start);
            }
          }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Fallback timeout
        setTimeout(() => {
          observer.disconnect();
          resolve(performance.now() - start);
        }, 5000);
      });
    });

    // Measure data processing time
    const dataProcessingTime = await this.page.evaluate(() => {
      const entries = performance.getEntriesByType('measure').filter(
        entry => entry.name.includes('data-processing')
      );
      return entries.reduce((total, entry) => total + entry.duration, 0);
    });

    // Measure interaction latency
    const interactionLatency = await this.measureInteractionLatency(chartSelector);

    // Get memory usage
    const memoryUsage = await this.getMemoryUsage();

    // Get Core Web Vitals
    const webVitals = await this.getCoreWebVitals();

    // Get bundle size impact
    const bundleSize = await this.getBundleSize();

    const metrics: PerformanceMetrics = {
      renderTime,
      dataProcessingTime,
      interactionLatency,
      memoryUsage,
      bundleSize,
      ...webVitals
    };

    const thresholds = this.getPerformanceThresholds(component);
    const passed = this.evaluatePerformance(metrics, thresholds);

    const result: BenchmarkResult = {
      component,
      testCase,
      metrics,
      passed,
      thresholds
    };

    this.results.push(result);
    return result;
  }

  private async measureInteractionLatency(chartSelector: string): Promise<number> {
    if (!this.page) return 0;

    return await this.page.evaluate((selector) => {
      return new Promise<number>((resolve) => {
        const chart = document.querySelector(selector);
        if (!chart) {
          resolve(0);
          return;
        }

        const start = performance.now();
        
        // Simulate hover interaction
        const event = new MouseEvent('mouseover', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: chart.getBoundingClientRect().left + 100,
          clientY: chart.getBoundingClientRect().top + 100
        });
        
        chart.dispatchEvent(event);
        
        // Wait for tooltip or response
        const observer = new MutationObserver(() => {
          const tooltip = document.querySelector('[role="tooltip"], .recharts-tooltip-wrapper');
          if (tooltip && tooltip.getBoundingClientRect().width > 0) {
            observer.disconnect();
            resolve(performance.now() - start);
          }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(performance.now() - start);
        }, 1000);
      });
    }, chartSelector);
  }

  private async getMemoryUsage(): Promise<number> {
    if (!this.page) return 0;

    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return 0;
    });
  }

  private async getCoreWebVitals() {
    if (!this.page) {
      return {
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        timeToInteractive: 0
      };
    }

    return await this.page.evaluate(() => {
      const entries = (window as any).performanceEntries || [];
      
      const fcp = entries.find((entry: any) => entry.name === 'first-contentful-paint');
      const lcp = entries.find((entry: any) => entry.name === 'largest-contentful-paint');
      
      const layoutShifts = entries.filter((entry: any) => entry.entryType === 'layout-shift');
      const cls = layoutShifts.reduce((total: number, entry: any) => total + entry.value, 0);

      // Estimate TTI based on navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const tti = navigation ? navigation.domInteractive - navigation.navigationStart : 0;

      return {
        firstContentfulPaint: fcp ? fcp.startTime : 0,
        largestContentfulPaint: lcp ? lcp.startTime : 0,
        cumulativeLayoutShift: cls,
        timeToInteractive: tti
      };
    });
  }

  private async getBundleSize(): Promise<number> {
    if (!this.page) return 0;

    return await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') && 
        (resource.name.includes('chart') || resource.name.includes('recharts'))
      );
      
      return jsResources.reduce((total, resource) => {
        return total + (resource.transferSize || 0);
      }, 0) / 1024; // KB
    });
  }

  private getPerformanceThresholds(component: string): Record<string, number> {
    const baseThresholds = {
      renderTime: 1000,        // 1s
      dataProcessingTime: 500,  // 500ms
      interactionLatency: 100,  // 100ms
      memoryUsage: 50,          // 50MB
      bundleSize: 500,          // 500KB
      firstContentfulPaint: 1200, // 1.2s
      largestContentfulPaint: 2500, // 2.5s
      cumulativeLayoutShift: 0.1,
      timeToInteractive: 3000   // 3s
    };

    // Component-specific adjustments
    switch (component) {
      case 'BudgetCharts':
        return {
          ...baseThresholds,
          renderTime: 800,  // Simpler charts should be faster
          bundleSize: 300
        };
      case 'WeddingMetricsDashboard':
        return {
          ...baseThresholds,
          renderTime: 1500,  // Complex dashboard allows more time
          memoryUsage: 75,
          bundleSize: 800
        };
      case 'TimelineEfficiencyTracker':
        return {
          ...baseThresholds,
          renderTime: 1200,
          dataProcessingTime: 800 // Complex timeline calculations
        };
      case 'VendorPerformanceAnalytics':
        return {
          ...baseThresholds,
          renderTime: 1000,
          memoryUsage: 60  // Vendor data can be memory intensive
        };
      default:
        return baseThresholds;
    }
  }

  private evaluatePerformance(metrics: PerformanceMetrics, thresholds: Record<string, number>): boolean {
    const checks = [
      metrics.renderTime <= thresholds.renderTime,
      metrics.dataProcessingTime <= thresholds.dataProcessingTime,
      metrics.interactionLatency <= thresholds.interactionLatency,
      metrics.memoryUsage <= thresholds.memoryUsage,
      metrics.bundleSize <= thresholds.bundleSize,
      metrics.firstContentfulPaint <= thresholds.firstContentfulPaint,
      metrics.largestContentfulPaint <= thresholds.largestContentfulPaint,
      metrics.cumulativeLayoutShift <= thresholds.cumulativeLayoutShift,
      metrics.timeToInteractive <= thresholds.timeToInteractive
    ];

    return checks.every(check => check);
  }

  async benchmarkLargeDataset(component: string, itemCount: number): Promise<BenchmarkResult> {
    if (!this.page) throw new Error('Page not initialized');

    // Generate large dataset
    const largeDataset = Array.from({ length: itemCount }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      category: `Category ${i % 10}`,
      date: new Date(2024, 0, i % 365).toISOString()
    }));

    // Mock API with large dataset
    await this.page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: largeDataset })
      });
    });

    return await this.measureChartRenderPerformance(
      '/dashboard/budget', 
      '[data-testid*="chart"]',
      component,
      `large-dataset-${itemCount}`
    );
  }

  async benchmarkConcurrentUpdates(component: string, updateCount: number): Promise<BenchmarkResult> {
    if (!this.page) throw new Error('Page not initialized');

    await this.page.goto('/dashboard/budget');
    await this.page.waitForSelector('[data-testid*="chart"]');

    const startTime = performance.now();

    // Simulate concurrent data updates
    for (let i = 0; i < updateCount; i++) {
      await this.page.evaluate((updateIndex) => {
        // Trigger data refresh
        const event = new CustomEvent('dataUpdate', { 
          detail: { updateIndex, data: Math.random() * 1000 } 
        });
        window.dispatchEvent(event);
      }, i);
      
      await this.page.waitForTimeout(10); // Small delay between updates
    }

    // Wait for all updates to complete
    await this.page.waitForFunction(
      (expectedCount) => {
        const charts = document.querySelectorAll('[data-testid*="chart"]');
        return charts.length > 0 && Array.from(charts).every(chart => 
          chart.getBoundingClientRect().width > 0
        );
      },
      updateCount,
      { timeout: 5000 }
    );

    const totalTime = performance.now() - startTime;
    const averageUpdateTime = totalTime / updateCount;

    const metrics: PerformanceMetrics = {
      renderTime: totalTime,
      dataProcessingTime: averageUpdateTime,
      interactionLatency: 0,
      memoryUsage: await this.getMemoryUsage(),
      bundleSize: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0
    };

    const thresholds = {
      renderTime: updateCount * 50, // 50ms per update
      dataProcessingTime: 100,
      interactionLatency: 0,
      memoryUsage: 100,
      bundleSize: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0
    };

    return {
      component,
      testCase: `concurrent-updates-${updateCount}`,
      metrics,
      passed: this.evaluatePerformance(metrics, thresholds),
      thresholds
    };
  }

  generateReport(): string {
    const passedCount = this.results.filter(r => r.passed).length;
    const totalCount = this.results.length;
    const passRate = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

    let report = `
# 📊 Chart Performance Benchmark Report

## Summary
- **Total Tests**: ${totalCount}
- **Passed**: ${passedCount}
- **Failed**: ${totalCount - passedCount}
- **Pass Rate**: ${passRate.toFixed(1)}%

## Performance Results

| Component | Test Case | Render Time | Memory Usage | Bundle Size | Status |
|-----------|-----------|-------------|--------------|-------------|--------|
`;

    for (const result of this.results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `| ${result.component} | ${result.testCase} | ${result.metrics.renderTime.toFixed(0)}ms | ${result.metrics.memoryUsage.toFixed(1)}MB | ${result.metrics.bundleSize.toFixed(0)}KB | ${status} |\n`;
    }

    report += `
## Detailed Metrics

`;

    for (const result of this.results) {
      report += `### ${result.component} - ${result.testCase}

**Performance Metrics:**
- 🎨 Render Time: ${result.metrics.renderTime.toFixed(2)}ms (threshold: ${result.thresholds.renderTime}ms)
- ⚡ Data Processing: ${result.metrics.dataProcessingTime.toFixed(2)}ms (threshold: ${result.thresholds.dataProcessingTime}ms)
- 🖱️ Interaction Latency: ${result.metrics.interactionLatency.toFixed(2)}ms (threshold: ${result.thresholds.interactionLatency}ms)
- 💾 Memory Usage: ${result.metrics.memoryUsage.toFixed(2)}MB (threshold: ${result.thresholds.memoryUsage}MB)
- 📦 Bundle Size: ${result.metrics.bundleSize.toFixed(2)}KB (threshold: ${result.thresholds.bundleSize}KB)

**Core Web Vitals:**
- 🎭 First Contentful Paint: ${result.metrics.firstContentfulPaint.toFixed(2)}ms
- 🏆 Largest Contentful Paint: ${result.metrics.largestContentfulPaint.toFixed(2)}ms
- 📏 Cumulative Layout Shift: ${result.metrics.cumulativeLayoutShift.toFixed(3)}
- ⏱️ Time to Interactive: ${result.metrics.timeToInteractive.toFixed(2)}ms

**Status**: ${result.passed ? '✅ All thresholds met' : '❌ Some thresholds exceeded'}

`;
    }

    return report;
  }

  getResults(): BenchmarkResult[] {
    return this.results;
  }

  getAverageMetrics(): PerformanceMetrics {
    if (this.results.length === 0) {
      return {
        renderTime: 0,
        dataProcessingTime: 0,
        interactionLatency: 0,
        memoryUsage: 0,
        bundleSize: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        timeToInteractive: 0
      };
    }

    const totals = this.results.reduce((acc, result) => {
      return {
        renderTime: acc.renderTime + result.metrics.renderTime,
        dataProcessingTime: acc.dataProcessingTime + result.metrics.dataProcessingTime,
        interactionLatency: acc.interactionLatency + result.metrics.interactionLatency,
        memoryUsage: acc.memoryUsage + result.metrics.memoryUsage,
        bundleSize: acc.bundleSize + result.metrics.bundleSize,
        firstContentfulPaint: acc.firstContentfulPaint + result.metrics.firstContentfulPaint,
        largestContentfulPaint: acc.largestContentfulPaint + result.metrics.largestContentfulPaint,
        cumulativeLayoutShift: acc.cumulativeLayoutShift + result.metrics.cumulativeLayoutShift,
        timeToInteractive: acc.timeToInteractive + result.metrics.timeToInteractive
      };
    }, {
      renderTime: 0,
      dataProcessingTime: 0,
      interactionLatency: 0,
      memoryUsage: 0,
      bundleSize: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      timeToInteractive: 0
    });

    const count = this.results.length;
    return {
      renderTime: totals.renderTime / count,
      dataProcessingTime: totals.dataProcessingTime / count,
      interactionLatency: totals.interactionLatency / count,
      memoryUsage: totals.memoryUsage / count,
      bundleSize: totals.bundleSize / count,
      firstContentfulPaint: totals.firstContentfulPaint / count,
      largestContentfulPaint: totals.largestContentfulPaint / count,
      cumulativeLayoutShift: totals.cumulativeLayoutShift / count,
      timeToInteractive: totals.timeToInteractive / count
    };
  }
}

// Performance benchmark test cases
test.describe('Chart Performance Benchmarks', () => {
  let benchmark: ChartPerformanceBenchmark;

  test.beforeAll(async () => {
    benchmark = new ChartPerformanceBenchmark();
    await benchmark.setup();
  });

  test.afterAll(async () => {
    // Generate final report
    const report = benchmark.generateReport();
    console.log(report);
    
    // Write report to file
    const fs = require('fs');
    fs.writeFileSync('tests/performance/chart-performance-report.md', report);
    
    // Write metrics to JSON for CI/CD
    const results = benchmark.getResults();
    const averageMetrics = benchmark.getAverageMetrics();
    
    fs.writeFileSync('tests/performance/benchmark-results.json', JSON.stringify({
      summary: {
        totalTests: results.length,
        passedTests: results.filter(r => r.passed).length,
        failedTests: results.filter(r => !r.passed).length,
        passRate: results.length > 0 ? (results.filter(r => r.passed).length / results.length) * 100 : 0
      },
      averageMetrics,
      detailedResults: results
    }, null, 2));
    
    await benchmark.cleanup();
  });

  test('BudgetCharts performance baseline', async () => {
    const result = await benchmark.measureChartRenderPerformance(
      '/dashboard/budget',
      '[data-testid="budget-pie-chart"]',
      'BudgetCharts'
    );

    expect(result.passed, `BudgetCharts performance failed: ${JSON.stringify(result.metrics)}`).toBe(true);
    expect(result.metrics.renderTime).toBeLessThan(800);
    expect(result.metrics.memoryUsage).toBeLessThan(50);
  });

  test('WeddingMetricsDashboard performance baseline', async () => {
    const result = await benchmark.measureChartRenderPerformance(
      '/dashboard/metrics',
      '[data-testid="revenue-trend-chart"]',
      'WeddingMetricsDashboard'
    );

    expect(result.passed, `WeddingMetricsDashboard performance failed: ${JSON.stringify(result.metrics)}`).toBe(true);
    expect(result.metrics.renderTime).toBeLessThan(1500);
    expect(result.metrics.firstContentfulPaint).toBeLessThan(1200);
  });

  test('TimelineEfficiencyTracker performance baseline', async () => {
    const result = await benchmark.measureChartRenderPerformance(
      '/dashboard/timeline-tracker',
      '[data-testid="efficiency-trend-chart"]',
      'TimelineEfficiencyTracker'
    );

    expect(result.passed, `TimelineEfficiencyTracker performance failed: ${JSON.stringify(result.metrics)}`).toBe(true);
    expect(result.metrics.renderTime).toBeLessThan(1200);
    expect(result.metrics.dataProcessingTime).toBeLessThan(800);
  });

  test('VendorPerformanceAnalytics performance baseline', async () => {
    const result = await benchmark.measureChartRenderPerformance(
      '/dashboard/vendor-analytics',
      '[data-testid="performance-trend-chart"]',
      'VendorPerformanceAnalytics'
    );

    expect(result.passed, `VendorPerformanceAnalytics performance failed: ${JSON.stringify(result.metrics)}`).toBe(true);
    expect(result.metrics.renderTime).toBeLessThan(1000);
    expect(result.metrics.memoryUsage).toBeLessThan(60);
  });

  test('Large dataset performance (100 categories)', async () => {
    const result = await benchmark.benchmarkLargeDataset('BudgetCharts', 100);

    expect(result.passed, `Large dataset performance failed: ${JSON.stringify(result.metrics)}`).toBe(true);
    expect(result.metrics.renderTime).toBeLessThan(2000);
    expect(result.metrics.memoryUsage).toBeLessThan(100);
  });

  test('Large dataset performance (500 vendors)', async () => {
    const result = await benchmark.benchmarkLargeDataset('VendorPerformanceAnalytics', 500);

    expect(result.passed, `Large vendor dataset performance failed: ${JSON.stringify(result.metrics)}`).toBe(true);
    expect(result.metrics.renderTime).toBeLessThan(3000);
    expect(result.metrics.memoryUsage).toBeLessThan(150);
  });

  test('Real-time updates performance (50 updates)', async () => {
    const result = await benchmark.benchmarkConcurrentUpdates('WeddingMetricsDashboard', 50);

    expect(result.passed, `Real-time updates performance failed: ${JSON.stringify(result.metrics)}`).toBe(true);
    expect(result.metrics.dataProcessingTime).toBeLessThan(100);
  });

  test('Memory leak detection', async ({ page }) => {
    await page.goto('/dashboard/metrics');
    
    // Initial memory measurement
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Simulate heavy chart interactions
    for (let i = 0; i < 20; i++) {
      await page.locator('[data-testid="refresh-data"]').click();
      await page.waitForTimeout(100);
      
      // Switch chart types
      await page.locator('[data-testid="chart-type-bar"]').click();
      await page.waitForTimeout(100);
      await page.locator('[data-testid="chart-type-line"]').click();
      await page.waitForTimeout(100);
    }

    // Final memory measurement
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
    expect(memoryIncrease).toBeLessThan(50); // Memory should not increase by more than 50MB
  });

  test('Chart responsiveness under load', async ({ page }) => {
    await page.goto('/dashboard/budget');
    
    const loadStartTime = Date.now();
    
    // Simulate multiple simultaneous interactions
    await Promise.all([
      page.locator('[data-testid="chart-type-pie"]').click(),
      page.locator('[data-testid="time-range-30d"]').click(),
      page.locator('[data-testid="refresh-data"]').click()
    ]);

    // Wait for all operations to complete
    await page.waitForSelector('[data-testid="budget-pie-chart"]');
    
    const loadEndTime = Date.now();
    const responsiveTime = loadEndTime - loadStartTime;

    expect(responsiveTime).toBeLessThan(2000); // Should complete within 2 seconds
  });
});