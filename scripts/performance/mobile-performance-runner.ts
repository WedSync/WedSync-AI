#!/usr/bin/env node

/**
 * WS-193 Mobile Performance Test Runner - Team D
 * Comprehensive mobile performance validation script for wedding workflows
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface PerformanceResults {
  timestamp: string;
  device: string;
  scenario: string;
  metrics: {
    lighthouse?: any;
    playwright?: any;
    pwa?: any;
  };
  passed: boolean;
  errors: string[];
}

class MobilePerformanceRunner {
  private results: PerformanceResults[] = [];
  private startTime: number = Date.now();
  
  constructor(private config: {
    devices?: string[];
    scenarios?: string[];
    outputDir?: string;
    verbose?: boolean;
  } = {}) {
    this.config = {
      devices: ['mobile', 'tablet'],
      scenarios: ['3G', '4G', 'WiFi'],
      outputDir: './test-results/mobile-performance',
      verbose: false,
      ...config
    };
  }

  async run(): Promise<void> {
    console.log('🎭 WS-193 Mobile Performance Test Suite - Team D');
    console.log('================================================');
    console.log('🎯 Focus: Mobile & PWA Performance for Wedding Workflows');
    console.log(`📱 Testing devices: ${this.config.devices?.join(', ')}`);
    console.log(`🌐 Testing scenarios: ${this.config.scenarios?.join(', ')}`);
    console.log('');

    await this.ensureOutputDirectory();
    await this.startApplication();

    try {
      // Run Lighthouse tests for all device/scenario combinations
      for (const device of this.config.devices!) {
        for (const scenario of this.config.scenarios!) {
          await this.runLighthouseTests(device, scenario);
        }
      }

      // Run comprehensive PWA tests
      await this.runPWATests();

      // Run cross-device validation
      await this.runCrossDeviceValidation();

      // Run wedding-specific workflow tests
      await this.runWeddingWorkflowTests();

      // Generate comprehensive report
      await this.generateReport();

    } finally {
      await this.stopApplication();
    }

    const duration = Date.now() - this.startTime;
    console.log(`\n✅ Mobile performance testing completed in ${Math.round(duration / 1000)}s`);
    
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests < totalTests) {
      console.error(`❌ ${totalTests - passedTests} tests failed`);
      process.exit(1);
    }
  }

  private async ensureOutputDirectory(): Promise<void> {
    await fs.mkdir(this.config.outputDir!, { recursive: true });
  }

  private async startApplication(): Promise<void> {
    console.log('🚀 Starting WedSync application...');
    
    // Check if application is already running
    try {
      await execAsync('curl -f http://localhost:3000 > /dev/null 2>&1');
      console.log('✅ Application already running on port 3000');
      return;
    } catch (e) {
      // Application not running, start it
    }

    return new Promise((resolve, reject) => {
      const app = spawn('npm', ['start'], { 
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        detached: false
      });

      let output = '';
      
      app.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('ready on') || output.includes('localhost:3000')) {
          console.log('✅ Application started successfully');
          resolve();
        }
      });

      app.stderr?.on('data', (data) => {
        if (this.config.verbose) {
          console.error(data.toString());
        }
      });

      app.on('error', (error) => {
        reject(new Error(`Failed to start application: ${error.message}`));
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        reject(new Error('Application startup timeout'));
      }, 60000);
    });
  }

  private async stopApplication(): Promise<void> {
    console.log('🛑 Stopping application...');
    try {
      // Kill any node processes on port 3000
      await execAsync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true');
    } catch (e) {
      // Ignore errors when stopping
    }
  }

  private async runLighthouseTests(device: string, scenario: string): Promise<void> {
    console.log(`\n🔍 Running Lighthouse tests - ${device} (${scenario})`);
    
    try {
      const { stdout } = await execAsync(
        `npx playwright test tests/performance/mobile/lighthouse-tests.ts --project="${device}-${scenario}"`,
        { cwd: process.cwd() }
      );

      this.results.push({
        timestamp: new Date().toISOString(),
        device,
        scenario: `lighthouse-${scenario}`,
        metrics: { lighthouse: this.parseLighthouseOutput(stdout) },
        passed: !stdout.includes('failed'),
        errors: this.extractErrors(stdout)
      });

      console.log(`✅ Lighthouse tests completed for ${device} (${scenario})`);
    } catch (error) {
      console.error(`❌ Lighthouse tests failed for ${device} (${scenario}): ${error}`);
      
      this.results.push({
        timestamp: new Date().toISOString(),
        device,
        scenario: `lighthouse-${scenario}`,
        metrics: {},
        passed: false,
        errors: [error instanceof Error ? error.message : String(error)]
      });
    }
  }

  private async runPWATests(): Promise<void> {
    console.log('\n📱 Running PWA performance tests...');
    
    try {
      const { stdout } = await execAsync(
        'npx playwright test tests/performance/mobile/pwa-performance.test.ts',
        { cwd: process.cwd() }
      );

      this.results.push({
        timestamp: new Date().toISOString(),
        device: 'mobile',
        scenario: 'pwa-validation',
        metrics: { pwa: this.parsePWAOutput(stdout) },
        passed: !stdout.includes('failed'),
        errors: this.extractErrors(stdout)
      });

      console.log('✅ PWA tests completed');
    } catch (error) {
      console.error(`❌ PWA tests failed: ${error}`);
      
      this.results.push({
        timestamp: new Date().toISOString(),
        device: 'mobile',
        scenario: 'pwa-validation',
        metrics: {},
        passed: false,
        errors: [error instanceof Error ? error.message : String(error)]
      });
    }
  }

  private async runCrossDeviceValidation(): Promise<void> {
    console.log('\n🔄 Running cross-device validation tests...');
    
    try {
      const { stdout } = await execAsync(
        'npx playwright test tests/performance/cross-device/',
        { cwd: process.cwd() }
      );

      this.results.push({
        timestamp: new Date().toISOString(),
        device: 'cross-device',
        scenario: 'validation',
        metrics: { playwright: this.parsePlaywrightOutput(stdout) },
        passed: !stdout.includes('failed'),
        errors: this.extractErrors(stdout)
      });

      console.log('✅ Cross-device validation completed');
    } catch (error) {
      console.error(`❌ Cross-device validation failed: ${error}`);
      
      this.results.push({
        timestamp: new Date().toISOString(),
        device: 'cross-device',
        scenario: 'validation',
        metrics: {},
        passed: false,
        errors: [error instanceof Error ? error.message : String(error)]
      });
    }
  }

  private async runWeddingWorkflowTests(): Promise<void> {
    console.log('\n💒 Running wedding-specific workflow tests...');
    
    const weddingWorkflows = [
      'venue-form-filling',
      'supplier-coordination',
      'emergency-communication',
      'photo-upload-reception'
    ];

    for (const workflow of weddingWorkflows) {
      try {
        console.log(`   Testing ${workflow}...`);
        
        const { stdout } = await execAsync(
          `npx playwright test tests/performance/cross-device/wedding-workflows.spec.ts -g "${workflow}"`,
          { cwd: process.cwd() }
        );

        this.results.push({
          timestamp: new Date().toISOString(),
          device: 'mobile',
          scenario: `wedding-${workflow}`,
          metrics: { playwright: this.parsePlaywrightOutput(stdout) },
          passed: !stdout.includes('failed'),
          errors: this.extractErrors(stdout)
        });

        console.log(`   ✅ ${workflow} completed`);
      } catch (error) {
        console.error(`   ❌ ${workflow} failed: ${error}`);
        
        this.results.push({
          timestamp: new Date().toISOString(),
          device: 'mobile',
          scenario: `wedding-${workflow}`,
          metrics: {},
          passed: false,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Generating comprehensive performance report...');

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        testSuite: 'WS-193 Mobile Performance Tests - Team D',
        devices: this.config.devices,
        scenarios: this.config.scenarios
      },
      summary: this.generateSummary(),
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // Save JSON report
    const jsonPath = path.join(this.config.outputDir!, 'mobile-performance-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlPath = path.join(this.config.outputDir!, 'mobile-performance-report.html');
    await fs.writeFile(htmlPath, this.generateHTMLReport(report));

    // Generate CI metrics
    const ciMetricsPath = path.join(this.config.outputDir!, 'ci-metrics.json');
    await fs.writeFile(ciMetricsPath, JSON.stringify(this.generateCIMetrics(report), null, 2));

    console.log(`✅ Reports generated:`);
    console.log(`   📄 JSON: ${jsonPath}`);
    console.log(`   🌐 HTML: ${htmlPath}`);
    console.log(`   🤖 CI Metrics: ${ciMetricsPath}`);
  }

  private generateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    
    const deviceBreakdown = this.results.reduce((acc, r) => {
      acc[r.device] = (acc[r.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const scenarioBreakdown = this.results.reduce((acc, r) => {
      acc[r.scenario] = (acc[r.scenario] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0%',
      deviceBreakdown,
      scenarioBreakdown,
      duration: Math.round((Date.now() - this.startTime) / 1000)
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedTests = this.results.filter(r => !r.passed);
    
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed. Review detailed error logs for specific issues.`);
    }

    const lighthouseFailures = failedTests.filter(r => r.scenario.includes('lighthouse'));
    if (lighthouseFailures.length > 0) {
      recommendations.push('Lighthouse performance tests failing. Review Core Web Vitals implementation.');
    }

    const pwaFailures = failedTests.filter(r => r.scenario.includes('pwa'));
    if (pwaFailures.length > 0) {
      recommendations.push('PWA tests failing. Check service worker implementation and offline capabilities.');
    }

    const weddingFailures = failedTests.filter(r => r.scenario.includes('wedding'));
    if (weddingFailures.length > 0) {
      recommendations.push('Wedding workflow tests failing. Verify wedding-specific performance requirements.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All mobile performance tests passed! Wedding workflows are ready for production.');
    }

    return recommendations;
  }

  private generateCIMetrics(report: any) {
    const summary = report.summary;
    
    return {
      mobile_performance_score: summary.passedTests / summary.totalTests * 100,
      total_tests: summary.totalTests,
      passed_tests: summary.passedTests,
      failed_tests: summary.failedTests,
      test_duration_seconds: summary.duration,
      wedding_workflow_readiness: this.calculateWeddingWorkflowReadiness(),
      pwa_compliance: this.calculatePWACompliance(),
      cross_device_compatibility: this.calculateCrossDeviceCompatibility(),
      performance_grade: this.calculatePerformanceGrade()
    };
  }

  private calculateWeddingWorkflowReadiness(): number {
    const weddingTests = this.results.filter(r => r.scenario.includes('wedding'));
    if (weddingTests.length === 0) return 100;
    
    const passedWeddingTests = weddingTests.filter(r => r.passed).length;
    return Math.round((passedWeddingTests / weddingTests.length) * 100);
  }

  private calculatePWACompliance(): number {
    const pwaTests = this.results.filter(r => r.scenario.includes('pwa'));
    if (pwaTests.length === 0) return 100;
    
    const passedPWATests = pwaTests.filter(r => r.passed).length;
    return Math.round((passedPWATests / pwaTests.length) * 100);
  }

  private calculateCrossDeviceCompatibility(): number {
    const crossDeviceTests = this.results.filter(r => r.device === 'cross-device');
    if (crossDeviceTests.length === 0) return 100;
    
    const passedCrossDeviceTests = crossDeviceTests.filter(r => r.passed).length;
    return Math.round((passedCrossDeviceTests / crossDeviceTests.length) * 100);
  }

  private calculatePerformanceGrade(): string {
    const score = this.results.filter(r => r.passed).length / this.results.length * 100;
    
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    return 'F';
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>WS-193 Mobile Performance Report - Team D</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0; padding: 20px; background: #f5f7fa; color: #2d3748;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;
        }
        .header h1 { margin: 0; font-size: 2.5rem; font-weight: 700; }
        .header p { margin: 10px 0 0 0; font-size: 1.1rem; opacity: 0.9; }
        .summary { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; margin-bottom: 30px; 
        }
        .metric-card { 
            background: white; padding: 25px; border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 4px solid #48bb78;
        }
        .metric-value { font-size: 2.5rem; font-weight: 700; color: #2d3748; margin: 0; }
        .metric-label { font-size: 0.9rem; color: #718096; margin: 5px 0 0 0; }
        .section { 
            background: white; padding: 30px; border-radius: 12px; 
            margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .section h2 { margin: 0 0 20px 0; color: #2d3748; font-size: 1.5rem; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .test-item { 
            padding: 15px; border-radius: 8px; border-left: 4px solid;
        }
        .test-passed { background: #f0fff4; border-color: #48bb78; }
        .test-failed { background: #fff5f5; border-color: #f56565; }
        .test-title { font-weight: 600; color: #2d3748; }
        .test-details { font-size: 0.85rem; color: #718096; margin-top: 5px; }
        .recommendations { background: #fffbeb; border: 1px solid #f6ad55; border-radius: 8px; padding: 20px; }
        .recommendation { margin: 10px 0; padding-left: 20px; position: relative; }
        .recommendation:before { content: "•"; color: #f6ad55; position: absolute; left: 0; font-weight: bold; }
        .footer { text-align: center; color: #718096; margin-top: 40px; }
        .grade { font-size: 3rem; font-weight: 700; text-align: center; margin: 20px 0; }
        .grade-a { color: #48bb78; }
        .grade-b { color: #ed8936; }
        .grade-c { color: #ecc94b; }
        .grade-f { color: #f56565; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎭 Mobile Performance Report</h1>
            <p>WS-193 Performance Tests Suite - Team D | ${new Date(report.metadata.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: #48bb78">${report.summary.passedTests}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: ${report.summary.failedTests > 0 ? '#f56565' : '#48bb78'}">${report.summary.failedTests}</div>
                <div class="metric-label">Tests Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.passRate}</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.duration}s</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>

        <div class="section">
            <h2>🎯 Performance Grade</h2>
            <div class="grade grade-${this.calculatePerformanceGrade().toLowerCase().charAt(0)}">
                ${this.calculatePerformanceGrade()}
            </div>
        </div>

        <div class="section">
            <h2>📱 Test Results</h2>
            <div class="test-grid">
                ${report.results.map((result: PerformanceResults) => `
                    <div class="test-item ${result.passed ? 'test-passed' : 'test-failed'}">
                        <div class="test-title">${result.device} - ${result.scenario}</div>
                        <div class="test-details">
                            ${result.passed ? '✅ Passed' : '❌ Failed'}
                            ${result.errors.length > 0 ? ` | ${result.errors.length} errors` : ''}
                        </div>
                        ${result.errors.length > 0 ? `
                            <div class="test-details" style="margin-top: 10px; color: #f56565;">
                                ${result.errors[0]}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations.map((rec: string) => `
                    <div class="recommendation">${rec}</div>
                `).join('')}
            </div>
        </div>

        <div class="footer">
            <p>Generated by WS-193 Mobile Performance Tests Suite | Team D - Mobile & PWA Performance Focus</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private parseLighthouseOutput(output: string): any {
    // Extract performance metrics from lighthouse output
    const metrics: any = {};
    
    const fcpMatch = output.match(/FCP[:\s]*(\d+)ms/);
    if (fcpMatch) metrics.FCP = parseInt(fcpMatch[1]);
    
    const lcpMatch = output.match(/LCP[:\s]*(\d+)ms/);
    if (lcpMatch) metrics.LCP = parseInt(lcpMatch[1]);
    
    const clsMatch = output.match(/CLS[:\s]*([0-9.]+)/);
    if (clsMatch) metrics.CLS = parseFloat(clsMatch[1]);
    
    const scoreMatch = output.match(/Performance Score[:\s]*(\d+)/);
    if (scoreMatch) metrics.PerformanceScore = parseInt(scoreMatch[1]);

    return metrics;
  }

  private parsePWAOutput(output: string): any {
    const metrics: any = {};
    
    const appShellMatch = output.match(/App shell load time[^\d]*(\d+)ms/);
    if (appShellMatch) metrics.AppShellLoadTime = parseInt(appShellMatch[1]);
    
    const offlineHandlingMatch = output.match(/Offline handling time[^\d]*(\d+)ms/);
    if (offlineHandlingMatch) metrics.OfflineHandlingTime = parseInt(offlineHandlingMatch[1]);
    
    const syncMatch = output.match(/Sync completion time[^\d]*(\d+)ms/);
    if (syncMatch) metrics.SyncTime = parseInt(syncMatch[1]);

    return metrics;
  }

  private parsePlaywrightOutput(output: string): any {
    const metrics: any = {};
    
    // Extract various timing metrics from playwright output
    const timingMatches = output.matchAll(/(\w+)\s+(?:time|Time)[^\d]*(\d+)ms/g);
    for (const match of timingMatches) {
      metrics[match[1]] = parseInt(match[2]);
    }

    return metrics;
  }

  private extractErrors(output: string): string[] {
    const errors: string[] = [];
    
    // Extract error messages
    const errorLines = output.split('\n').filter(line => 
      line.includes('Error:') || 
      line.includes('Failed:') || 
      line.includes('✗') ||
      line.includes('❌')
    );
    
    errorLines.forEach(line => {
      const cleaned = line.replace(/^\s*[\d\s]*[✗❌]?\s*/, '').trim();
      if (cleaned && !errors.includes(cleaned)) {
        errors.push(cleaned);
      }
    });

    return errors.slice(0, 5); // Limit to first 5 errors
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const config: any = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--devices':
        config.devices = args[++i]?.split(',') || ['mobile', 'tablet'];
        break;
      case '--scenarios':
        config.scenarios = args[++i]?.split(',') || ['3G', '4G', 'WiFi'];
        break;
      case '--output':
        config.outputDir = args[++i];
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        console.log(`
WS-193 Mobile Performance Test Runner - Team D

Usage: node mobile-performance-runner.ts [options]

Options:
  --devices <list>    Comma-separated list of devices (mobile,tablet,desktop)
  --scenarios <list>  Comma-separated list of scenarios (3G,4G,WiFi)
  --output <dir>      Output directory for reports
  --verbose           Enable verbose logging
  --help              Show this help message

Examples:
  node mobile-performance-runner.ts
  node mobile-performance-runner.ts --devices mobile,tablet --scenarios 3G,4G
  node mobile-performance-runner.ts --verbose --output ./custom-results
        `);
        process.exit(0);
    }
  }

  const runner = new MobilePerformanceRunner(config);
  runner.run().catch(error => {
    console.error('❌ Performance test runner failed:', error);
    process.exit(1);
  });
}

export default MobilePerformanceRunner;