import { chromium, Browser, Page } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

interface BenchmarkResult {
  testName: string;
  deviceType: string;
  timestamp: string;
  metrics: {
    renderTime: number;
    exportTime: number;
    memoryUsage: number;
    networkLatency: number;
    batteryImpact: number;
    coreWebVitals: {
      fcp: number;
      lcp: number;
      cls: number;
      fid: number;
      inp: number;
    };
  };
  passed: boolean;
  errors?: string[];
}

interface BenchmarkConfig {
  testUrl: string;
  devices: string[];
  iterations: number;
  outputPath: string;
  thresholds: Record<string, number>;
}

class BenchmarkRunner {
  private browser: Browser | null = null;
  private results: BenchmarkResult[] = [];

  constructor(private config: BenchmarkConfig) {}

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
  }

  async runBenchmarks(): Promise<BenchmarkResult[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    console.log('🚀 Starting WS-166 Performance Benchmarks...\n');

    for (const device of this.config.devices) {
      console.log(`📱 Testing on ${device}...`);
      
      for (let iteration = 1; iteration <= this.config.iterations; iteration++) {
        console.log(`  Iteration ${iteration}/${this.config.iterations}`);
        
        const result = await this.runSingleBenchmark(device, iteration);
        this.results.push(result);
        
        this.logResult(result);
      }
      
      console.log('');
    }

    await this.generateReport();
    return this.results;
  }

  private async runSingleBenchmark(deviceType: string, iteration: number): Promise<BenchmarkResult> {
    const page = await this.browser!.newPage();
    const testName = `export-performance-${deviceType}-${iteration}`;
    const startTime = Date.now();
    
    try {
      // Set device configuration
      await this.configureDevice(page, deviceType);
      
      // Navigate to test page
      await page.goto(this.config.testUrl, { waitUntil: 'networkidle' });
      
      // Collect baseline metrics
      const baselineMetrics = await this.collectMetrics(page);
      
      // Test export dialog render performance
      const renderStartTime = performance.now();
      await page.click('[data-testid="export-button"]');
      await page.waitForSelector('[data-testid="export-dialog"]', { state: 'visible' });
      const renderTime = performance.now() - renderStartTime;
      
      // Test export generation performance
      const exportStartTime = performance.now();
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="csv-export-button"]');
      await downloadPromise;
      const exportTime = performance.now() - exportStartTime;
      
      // Collect final metrics
      const finalMetrics = await this.collectMetrics(page);
      
      // Calculate memory usage
      const memoryUsage = finalMetrics.usedJSHeapSize - baselineMetrics.usedJSHeapSize;
      
      // Get Core Web Vitals
      const coreWebVitals = await this.collectCoreWebVitals(page);
      
      const result: BenchmarkResult = {
        testName,
        deviceType,
        timestamp: new Date().toISOString(),
        metrics: {
          renderTime,
          exportTime,
          memoryUsage: memoryUsage / (1024 * 1024), // Convert to MB
          networkLatency: 0, // Will be updated based on network requests
          batteryImpact: this.estimateBatteryImpact(renderTime, exportTime, memoryUsage),
          coreWebVitals
        },
        passed: this.evaluatePerformance(renderTime, exportTime, memoryUsage, coreWebVitals)
      };

      await page.close();
      return result;
      
    } catch (error) {
      await page.close();
      
      return {
        testName,
        deviceType,
        timestamp: new Date().toISOString(),
        metrics: {
          renderTime: 0,
          exportTime: 0,
          memoryUsage: 0,
          networkLatency: 0,
          batteryImpact: 0,
          coreWebVitals: { fcp: 0, lcp: 0, cls: 0, fid: 0, inp: 0 }
        },
        passed: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private async configureDevice(page: Page, deviceType: string): Promise<void> {
    const deviceConfigs = {
      'iPhone 12': {
        viewport: { width: 375, height: 812 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      'Samsung Galaxy S21': {
        viewport: { width: 384, height: 854 },
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
      },
      'Budget Android': {
        viewport: { width: 360, height: 640 },
        userAgent: 'Mozilla/5.0 (Linux; Android 9; SM-A105F) AppleWebKit/537.36'
      }
    };

    const config = deviceConfigs[deviceType as keyof typeof deviceConfigs];
    if (config) {
      await page.setViewportSize(config.viewport);
      await page.setUserAgent(config.userAgent);
    }
  }

  private async collectMetrics(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory?.usedJSHeapSize || 0,
        totalJSHeapSize: memory?.totalJSHeapSize || 0,
        jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
        timestamp: performance.now()
      };
    });
  }

  private async collectCoreWebVitals(page: Page): Promise<any> {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          fcp: 0,
          lcp: 0,
          cls: 0,
          fid: 0,
          inp: 0
        };

        let observers = 0;
        let completed = 0;

        const checkCompletion = () => {
          completed++;
          if (completed === observers) {
            resolve(vitals);
          }
        };

        // FCP
        if ('PerformanceObserver' in window) {
          observers++;
          new PerformanceObserver((list) => {
            const entries = list.getEntriesByName('first-contentful-paint');
            if (entries.length > 0) {
              vitals.fcp = entries[0].startTime;
            }
            checkCompletion();
          }).observe({ entryTypes: ['paint'] });

          // LCP
          observers++;
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.lcp = entries[entries.length - 1].startTime;
            }
            checkCompletion();
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // CLS
          observers++;
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            vitals.cls = clsValue;
            checkCompletion();
          }).observe({ entryTypes: ['layout-shift'] });
        }

        // Fallback timeout
        setTimeout(() => resolve(vitals), 3000);
      });
    });
  }

  private estimateBatteryImpact(renderTime: number, exportTime: number, memoryUsage: number): number {
    // Simplified battery impact calculation
    // Based on render time, export time, and memory usage
    const renderImpact = renderTime / 1000 * 0.1; // 0.1% per second
    const exportImpact = exportTime / 1000 * 0.2; // 0.2% per second
    const memoryImpact = (memoryUsage / (1024 * 1024)) * 0.01; // 0.01% per MB
    
    return renderImpact + exportImpact + memoryImpact;
  }

  private evaluatePerformance(renderTime: number, exportTime: number, memoryUsage: number, vitals: any): boolean {
    const thresholds = this.config.thresholds;
    
    return renderTime < thresholds.renderTime &&
           exportTime < thresholds.exportTime &&
           (memoryUsage / (1024 * 1024)) < thresholds.memoryUsage &&
           vitals.fcp < thresholds.fcp &&
           vitals.lcp < thresholds.lcp &&
           vitals.cls < thresholds.cls;
  }

  private logResult(result: BenchmarkResult): void {
    const status = result.passed ? '✅' : '❌';
    const { metrics } = result;
    
    console.log(`    ${status} ${result.testName}`);
    console.log(`       Render: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`       Export: ${metrics.exportTime.toFixed(2)}ms`);
    console.log(`       Memory: ${metrics.memoryUsage.toFixed(2)}MB`);
    console.log(`       FCP: ${metrics.coreWebVitals.fcp.toFixed(2)}ms`);
    console.log(`       LCP: ${metrics.coreWebVitals.lcp.toFixed(2)}ms`);
    console.log(`       CLS: ${metrics.coreWebVitals.cls.toFixed(4)}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`       Errors: ${result.errors.join(', ')}`);
    }
  }

  private async generateReport(): Promise<void> {
    const reportData = {
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        passRate: (this.results.filter(r => r.passed).length / this.results.length) * 100
      },
      deviceBreakdown: this.generateDeviceBreakdown(),
      performanceMetrics: this.calculateAverageMetrics(),
      detailedResults: this.results,
      timestamp: new Date().toISOString(),
      thresholds: this.config.thresholds
    };

    const reportPath = path.join(this.config.outputPath, `performance-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log('📊 Performance Report Generated');
    console.log(`   Total Tests: ${reportData.summary.totalTests}`);
    console.log(`   Pass Rate: ${reportData.summary.passRate.toFixed(1)}%`);
    console.log(`   Report saved to: ${reportPath}`);
  }

  private generateDeviceBreakdown(): Record<string, any> {
    const breakdown: Record<string, any> = {};
    
    for (const device of this.config.devices) {
      const deviceResults = this.results.filter(r => r.deviceType === device);
      breakdown[device] = {
        totalTests: deviceResults.length,
        passed: deviceResults.filter(r => r.passed).length,
        averageRenderTime: deviceResults.reduce((acc, r) => acc + r.metrics.renderTime, 0) / deviceResults.length,
        averageExportTime: deviceResults.reduce((acc, r) => acc + r.metrics.exportTime, 0) / deviceResults.length,
        averageMemoryUsage: deviceResults.reduce((acc, r) => acc + r.metrics.memoryUsage, 0) / deviceResults.length
      };
    }
    
    return breakdown;
  }

  private calculateAverageMetrics(): Record<string, number> {
    const validResults = this.results.filter(r => r.passed);
    
    if (validResults.length === 0) {
      return {};
    }

    return {
      averageRenderTime: validResults.reduce((acc, r) => acc + r.metrics.renderTime, 0) / validResults.length,
      averageExportTime: validResults.reduce((acc, r) => acc + r.metrics.exportTime, 0) / validResults.length,
      averageMemoryUsage: validResults.reduce((acc, r) => acc + r.metrics.memoryUsage, 0) / validResults.length,
      averageFCP: validResults.reduce((acc, r) => acc + r.metrics.coreWebVitals.fcp, 0) / validResults.length,
      averageLCP: validResults.reduce((acc, r) => acc + r.metrics.coreWebVitals.lcp, 0) / validResults.length,
      averageCLS: validResults.reduce((acc, r) => acc + r.metrics.coreWebVitals.cls, 0) / validResults.length
    };
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export { BenchmarkRunner, type BenchmarkResult, type BenchmarkConfig };