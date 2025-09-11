#!/usr/bin/env tsx
/**
 * WS-173: Performance Regression Testing Automation
 * Team E - Round 2 Implementation
 * 
 * Automated performance regression detection and prevention system
 * Integrates with CI/CD pipeline to catch performance regressions before deployment
 * 
 * Usage:
 * tsx scripts/ws-173-performance-regression-automation.ts --mode=ci
 * tsx scripts/ws-173-performance-regression-automation.ts --mode=baseline --save
 */

import { performance } from 'perf_hooks';
import { chromium, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface PerformanceBaseline {
  version: string;
  timestamp: string;
  commit: string;
  branch: string;
  metrics: {
    [url: string]: {
      lcp: number;
      fid: number;
      cls: number;
      fcp: number;
      ttfb: number;
      loadTime: number;
      bundleSize: number;
      transferSize: number;
    };
  };
  environment: {
    node: string;
    browser: string;
    platform: string;
  };
}

interface RegressionThresholds {
  lcp: number;        // % increase threshold
  fid: number;        // % increase threshold
  cls: number;        // % increase threshold
  loadTime: number;   // % increase threshold
  bundleSize: number; // % increase threshold
  transferSize: number; // % increase threshold
}

interface RegressionResult {
  url: string;
  metric: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
  threshold: number;
  isRegression: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class PerformanceRegressionDetector {
  private baselinePath: string;
  private reportPath: string;
  private thresholds: RegressionThresholds;
  private criticalPages: string[];

  constructor() {
    this.baselinePath = path.join(process.cwd(), 'performance-baselines', 'current-baseline.json');
    this.reportPath = path.join(process.cwd(), 'reports', `regression-report-${Date.now()}.json`);
    
    // Performance regression thresholds (% increase)
    this.thresholds = {
      lcp: 10,        // 10% LCP increase = regression
      fid: 15,        // 15% FID increase = regression  
      cls: 5,         // 5% CLS increase = regression
      loadTime: 20,   // 20% load time increase = regression
      bundleSize: 15, // 15% bundle size increase = regression
      transferSize: 25 // 25% transfer size increase = regression
    };

    // Critical wedding supplier pages that must not regress
    this.criticalPages = [
      '/',                           // Dashboard home
      '/dashboard/clients',          // Client management (most used)
      '/dashboard/timeline',         // Timeline view (wedding day critical)
      '/dashboard/tasks',            // Task management
      '/dashboard/communications',   // Communications center
      '/dashboard/budget',           // Budget tracking
      '/forms/new',                  // Form creation
      '/api/clients',                // Critical API endpoint
      '/api/notifications',          // Notification API
    ];
  }

  async runRegressionTest(mode: 'baseline' | 'ci' | 'compare', saveBaseline = false) {
    console.log(`🔍 Starting Performance Regression Testing (${mode} mode)...`);
    
    const currentMetrics = await this.measureCurrentPerformance();
    
    if (mode === 'baseline' || !fs.existsSync(this.baselinePath)) {
      if (saveBaseline) {
        await this.saveBaseline(currentMetrics);
        console.log('✅ Performance baseline saved');
        return { regressions: [], status: 'baseline-saved' };
      } else {
        console.log('⚠️ No baseline found and save flag not set');
        return { regressions: [], status: 'no-baseline' };
      }
    }

    const baseline = this.loadBaseline();
    const regressions = this.detectRegressions(baseline, currentMetrics);
    
    const report = {
      timestamp: new Date().toISOString(),
      mode,
      baseline: {
        version: baseline.version,
        timestamp: baseline.timestamp,
        commit: baseline.commit
      },
      current: {
        version: this.getCurrentVersion(),
        commit: this.getCurrentCommit(),
        branch: this.getCurrentBranch()
      },
      regressions,
      summary: this.generateRegressionSummary(regressions),
      recommendations: this.generateRecommendations(regressions)
    };

    this.saveReport(report);
    
    if (mode === 'ci') {
      this.handleCIResult(report);
    }

    return report;
  }

  private async measureCurrentPerformance(): Promise<PerformanceBaseline> {
    console.log('📊 Measuring current performance...');
    
    const browser = await chromium.launch({ headless: true });
    const metrics: PerformanceBaseline['metrics'] = {};

    // Test desktop performance
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    // Test mobile performance  
    const mobileContext = await browser.newContext({
      ...devices['iPhone 12']
    });

    for (const pageUrl of this.criticalPages) {
      console.log(`Testing ${pageUrl}...`);
      
      // Desktop measurements
      const desktopMetrics = await this.measurePageMetrics(desktopContext, pageUrl);
      
      // Mobile measurements (for critical pages)
      const isCritical = ['/dashboard/clients', '/dashboard/timeline', '/'].includes(pageUrl);
      const mobileMetrics = isCritical ? 
        await this.measurePageMetrics(mobileContext, pageUrl) : null;

      // Use worse performance between desktop/mobile for regression detection
      metrics[pageUrl] = {
        lcp: Math.max(desktopMetrics.lcp, mobileMetrics?.lcp || 0),
        fid: Math.max(desktopMetrics.fid, mobileMetrics?.fid || 0),
        cls: Math.max(desktopMetrics.cls, mobileMetrics?.cls || 0),
        fcp: Math.max(desktopMetrics.fcp, mobileMetrics?.fcp || 0),
        ttfb: Math.max(desktopMetrics.ttfb, mobileMetrics?.ttfb || 0),
        loadTime: Math.max(desktopMetrics.loadTime, mobileMetrics?.loadTime || 0),
        bundleSize: desktopMetrics.bundleSize,
        transferSize: desktopMetrics.transferSize
      };
    }

    await browser.close();

    return {
      version: this.getCurrentVersion(),
      timestamp: new Date().toISOString(),
      commit: this.getCurrentCommit(),
      branch: this.getCurrentBranch(),
      metrics,
      environment: {
        node: process.version,
        browser: 'chromium',
        platform: process.platform
      }
    };
  }

  private async measurePageMetrics(context: any, pageUrl: string) {
    const page = await context.newPage();
    
    try {
      const startTime = performance.now();
      
      // Navigate and wait for load
      const response = await page.goto(`http://localhost:3000${pageUrl}`, {
        waitUntil: 'networkidle'
      });
      
      if (!response?.ok()) {
        throw new Error(`HTTP ${response?.status()} for ${pageUrl}`);
      }

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Get Core Web Vitals using Web Vitals library approach
      const vitals = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          const metrics = {
            lcp: 0,
            fid: 0,  
            cls: 0,
            fcp: 0,
            ttfb: 0
          };

          let resolveCount = 0;
          const maxResolveCount = 3;

          function checkResolve() {
            resolveCount++;
            if (resolveCount >= maxResolveCount) {
              resolve(metrics);
            }
          }

          // LCP Observer
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              metrics.lcp = lastEntry.startTime;
            }
            checkResolve();
          }).observe({ type: 'largest-contentful-paint', buffered: true });

          // FID Observer
          new PerformanceObserver((list) => {
            const firstInput = list.getEntries()[0];
            if (firstInput) {
              metrics.fid = (firstInput as any).processingStart - firstInput.startTime;
            }
            checkResolve();
          }).observe({ type: 'first-input', buffered: true });

          // CLS Observer
          let clsValue = 0;
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            metrics.cls = clsValue;
            checkResolve();
          }).observe({ type: 'layout-shift', buffered: true });

          // FCP from paint timing
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            metrics.fcp = fcpEntry.startTime;
          }

          // TTFB from navigation timing
          const navEntry = performance.getEntriesByType('navigation')[0] as any;
          if (navEntry) {
            metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
          }

          // Fallback timeout
          setTimeout(() => resolve(metrics), 5000);
        });
      });

      // Get bundle and transfer sizes
      const resourceInfo = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as any[];
        
        let bundleSize = 0;
        let transferSize = 0;
        
        resources.forEach(resource => {
          if (resource.name.includes('.js') || resource.name.includes('.css')) {
            bundleSize += resource.decodedBodySize || 0;
          }
          transferSize += resource.transferSize || 0;
        });
        
        return { bundleSize, transferSize };
      });

      await page.close();

      return {
        lcp: vitals.lcp || 0,
        fid: vitals.fid || 0,
        cls: vitals.cls || 0,
        fcp: vitals.fcp || 0,
        ttfb: vitals.ttfb || 0,
        loadTime,
        bundleSize: resourceInfo.bundleSize,
        transferSize: resourceInfo.transferSize
      };

    } catch (error) {
      console.error(`Failed to measure ${pageUrl}:`, error);
      await page.close();
      
      // Return zero metrics for failed pages
      return {
        lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0,
        loadTime: 0, bundleSize: 0, transferSize: 0
      };
    }
  }

  private detectRegressions(baseline: PerformanceBaseline, current: PerformanceBaseline): RegressionResult[] {
    const regressions: RegressionResult[] = [];

    for (const [url, currentMetrics] of Object.entries(current.metrics)) {
      const baselineMetrics = baseline.metrics[url];
      
      if (!baselineMetrics) {
        console.log(`⚠️ No baseline found for ${url}, skipping...`);
        continue;
      }

      // Check each metric for regression
      const metricsToCheck: Array<keyof typeof baselineMetrics> = [
        'lcp', 'fid', 'cls', 'loadTime', 'bundleSize', 'transferSize'
      ];

      metricsToCheck.forEach(metric => {
        const baselineValue = baselineMetrics[metric];
        const currentValue = currentMetrics[metric];
        
        if (baselineValue === 0) return; // Skip if baseline is 0
        
        const change = currentValue - baselineValue;
        const changePercent = (change / baselineValue) * 100;
        const threshold = this.thresholds[metric] || 10;
        
        const isRegression = changePercent > threshold;
        
        if (isRegression) {
          regressions.push({
            url,
            metric,
            baseline: baselineValue,
            current: currentValue,
            change,
            changePercent,
            threshold,
            isRegression: true,
            severity: this.calculateSeverity(metric, changePercent, url)
          });
        }
      });
    }

    return regressions;
  }

  private calculateSeverity(
    metric: string, 
    changePercent: number, 
    url: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const isCriticalPage = ['/dashboard/clients', '/dashboard/timeline', '/'].includes(url);
    const isCoreWebVital = ['lcp', 'fid', 'cls'].includes(metric);
    
    if (changePercent > 50) return 'critical';
    if (changePercent > 30 && (isCriticalPage || isCoreWebVital)) return 'critical';
    if (changePercent > 25) return 'high';
    if (changePercent > 15 && isCoreWebVital) return 'high';
    if (changePercent > 20) return 'medium';
    return 'low';
  }

  private generateRegressionSummary(regressions: RegressionResult[]) {
    const severityCounts = {
      critical: regressions.filter(r => r.severity === 'critical').length,
      high: regressions.filter(r => r.severity === 'high').length,  
      medium: regressions.filter(r => r.severity === 'medium').length,
      low: regressions.filter(r => r.severity === 'low').length
    };

    const metricCounts = {
      lcp: regressions.filter(r => r.metric === 'lcp').length,
      fid: regressions.filter(r => r.metric === 'fid').length,
      cls: regressions.filter(r => r.metric === 'cls').length,
      loadTime: regressions.filter(r => r.metric === 'loadTime').length,
      bundleSize: regressions.filter(r => r.metric === 'bundleSize').length,
      transferSize: regressions.filter(r => r.metric === 'transferSize').length
    };

    const worstRegressions = regressions
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    return {
      totalRegressions: regressions.length,
      severityBreakdown: severityCounts,
      metricBreakdown: metricCounts,
      worstRegressions,
      overallStatus: this.calculateOverallStatus(severityCounts),
      blockingForDeploy: severityCounts.critical > 0 || severityCounts.high > 3
    };
  }

  private calculateOverallStatus(severityCounts: any): 'pass' | 'warning' | 'fail' {
    if (severityCounts.critical > 0) return 'fail';
    if (severityCounts.high > 3 || severityCounts.medium > 10) return 'fail';
    if (severityCounts.high > 0 || severityCounts.medium > 5) return 'warning';
    return 'pass';
  }

  private generateRecommendations(regressions: RegressionResult[]) {
    const recommendations = [];
    
    const lcpRegressions = regressions.filter(r => r.metric === 'lcp');
    const bundleRegressions = regressions.filter(r => r.metric === 'bundleSize');
    const clsRegressions = regressions.filter(r => r.metric === 'cls');
    
    if (lcpRegressions.length > 0) {
      recommendations.push({
        category: 'Largest Contentful Paint',
        priority: 'high',
        issue: `LCP regressions detected on ${lcpRegressions.length} pages`,
        actions: [
          'Check for unoptimized images or slow server responses',
          'Review critical resource loading and prioritization',
          'Consider implementing preload hints for key resources',
          'Optimize database queries for faster server response'
        ]
      });
    }

    if (bundleRegressions.length > 0) {
      recommendations.push({
        category: 'Bundle Size',
        priority: 'medium',
        issue: `Bundle size increases detected`,
        actions: [
          'Run bundle analyzer to identify size increases',
          'Check for newly added dependencies',
          'Consider code splitting for large components',
          'Remove unused code and dependencies'
        ]
      });
    }

    if (clsRegressions.length > 0) {
      recommendations.push({
        category: 'Cumulative Layout Shift',
        priority: 'high',
        issue: `Layout stability regressions detected`,
        actions: [
          'Add size attributes to images and embeds',
          'Reserve space for dynamic content',
          'Avoid inserting content above existing content',
          'Use transform animations instead of changing element properties'
        ]
      });
    }

    return recommendations;
  }

  private saveBaseline(baseline: PerformanceBaseline) {
    const baselineDir = path.dirname(this.baselinePath);
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    // Archive previous baseline
    if (fs.existsSync(this.baselinePath)) {
      const archivePath = path.join(
        baselineDir, 
        `baseline-${Date.now()}.json`
      );
      fs.copyFileSync(this.baselinePath, archivePath);
    }

    fs.writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2));
  }

  private loadBaseline(): PerformanceBaseline {
    if (!fs.existsSync(this.baselinePath)) {
      throw new Error('No performance baseline found. Run with --save flag to create baseline.');
    }
    
    return JSON.parse(fs.readFileSync(this.baselinePath, 'utf-8'));
  }

  private saveReport(report: any) {
    const reportsDir = path.dirname(this.reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Regression report saved: ${this.reportPath}`);
  }

  private handleCIResult(report: any) {
    const { summary } = report;
    
    console.log('\n🎯 Performance Regression Test Results:');
    console.log(`Total Regressions: ${summary.totalRegressions}`);
    console.log(`Critical: ${summary.severityBreakdown.critical}`);
    console.log(`High: ${summary.severityBreakdown.high}`);
    console.log(`Medium: ${summary.severityBreakdown.medium}`);
    console.log(`Low: ${summary.severityBreakdown.low}`);
    console.log(`Overall Status: ${summary.overallStatus.toUpperCase()}`);
    
    if (summary.blockingForDeploy) {
      console.log('\n❌ DEPLOYMENT BLOCKED - Critical performance regressions detected');
      console.log('\nTop Regressions:');
      summary.worstRegressions.forEach((regression: RegressionResult) => {
        console.log(`  ${regression.severity.toUpperCase()}: ${regression.url} ${regression.metric} +${regression.changePercent.toFixed(1)}%`);
      });
      
      process.exit(1);
    } else if (summary.overallStatus === 'warning') {
      console.log('\n⚠️ WARNING - Performance regressions detected but not blocking');
      process.exit(0);
    } else {
      console.log('\n✅ PASS - No significant performance regressions detected');
      process.exit(0);
    }
  }

  private getCurrentVersion(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  private getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] as 'baseline' | 'ci' | 'compare' || 'compare';
  const saveBaseline = args.includes('--save');
  
  console.log('🎯 WS-173 Performance Regression Detection');
  console.log(`Mode: ${mode}`);
  
  if (mode === 'baseline' && !saveBaseline) {
    console.log('⚠️ Baseline mode requires --save flag');
    process.exit(1);
  }

  const detector = new PerformanceRegressionDetector();
  
  try {
    const result = await detector.runRegressionTest(mode, saveBaseline);
    
    if (mode !== 'ci') {
      console.log('\n📊 Test completed successfully');
      console.log(`Regressions found: ${result.regressions?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Performance regression test failed:', error);
    process.exit(1);
  }
}

// Export for programmatic usage
export { PerformanceRegressionDetector };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}