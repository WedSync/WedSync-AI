// Performance Test Runner for WS-257 CI/CD Integration
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { PerformanceReporter, PerformanceReport, PerformanceMetric } from '../utils/performance-utils';
import { defaultPerformanceConfig } from '../config/performance-config';

const execAsync = promisify(exec);

export interface TestRunnerConfig {
  environment: 'local' | 'staging' | 'production';
  testSuites: string[];
  parallel: boolean;
  maxConcurrency: number;
  reportFormats: ('json' | 'html' | 'junit')[];
  failOnThreshold: boolean;
  webhookUrl?: string;
  slackChannel?: string;
  emailRecipients?: string[];
}

export class PerformanceTestRunner {
  private reporter: PerformanceReporter;
  private config: TestRunnerConfig;
  private startTime: number = 0;

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.reporter = new PerformanceReporter();
    this.config = {
      environment: 'local',
      testSuites: ['wedding-day-load', 'mobile-performance', 'api-performance'],
      parallel: true,
      maxConcurrency: 4,
      reportFormats: ['json', 'html'],
      failOnThreshold: true,
      ...config
    };
  }

  async runAllTests(): Promise<{
    success: boolean;
    summary: any;
    reports: PerformanceReport[];
    artifacts: string[];
  }> {
    console.log('🚀 Starting WedSync Performance Test Suite');
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Test Suites: ${this.config.testSuites.join(', ')}`);
    console.log(`Parallel Execution: ${this.config.parallel}`);
    
    this.startTime = Date.now();

    try {
      // Pre-test setup
      await this.setupTestEnvironment();
      
      // Run test suites
      const testResults = await this.executeTestSuites();
      
      // Generate reports
      const artifacts = await this.generateReports();
      
      // Post-test cleanup and notifications
      await this.cleanup();
      await this.sendNotifications(testResults.success);

      const summary = this.reporter.generateSummaryReport();
      
      console.log('✅ Performance Test Suite Complete');
      this.logSummary(summary);

      return {
        success: testResults.success,
        summary,
        reports: testResults.reports,
        artifacts
      };
    } catch (error) {
      console.error('❌ Performance Test Suite Failed:', error);
      await this.sendNotifications(false, error.message);
      throw error;
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');

    // Ensure test database is ready
    if (this.config.environment !== 'production') {
      try {
        await execAsync('npm run db:test:setup', { cwd: process.cwd() });
        console.log('✅ Test database ready');
      } catch (error) {
        console.warn('⚠️ Test database setup failed, continuing with existing data');
      }
    }

    // Start local services if needed
    if (this.config.environment === 'local') {
      try {
        // Check if services are running
        await execAsync('npm run services:check', { cwd: process.cwd() });
        console.log('✅ Local services are running');
      } catch (error) {
        console.log('🔄 Starting local services...');
        await execAsync('npm run services:start', { cwd: process.cwd() });
      }
    }

    // Warm up the application
    await this.warmupApplication();

    console.log('✅ Test environment setup complete');
  }

  private async warmupApplication(): Promise<void> {
    console.log('🔥 Warming up application...');
    
    const warmupEndpoints = [
      '/api/health',
      '/api/cache/health',
      '/dashboard'
    ];

    const warmupPromises = warmupEndpoints.map(async (endpoint) => {
      try {
        const baseUrl = this.getBaseUrl();
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          timeout: 10000
        });
        console.log(`✅ Warmed up ${endpoint}: ${response.status}`);
      } catch (error) {
        console.warn(`⚠️ Warmup failed for ${endpoint}: ${error.message}`);
      }
    });

    await Promise.allSettled(warmupPromises);
    console.log('✅ Application warmup complete');
  }

  private async executeTestSuites(): Promise<{
    success: boolean;
    reports: PerformanceReport[];
  }> {
    console.log('🧪 Executing performance test suites...');
    
    const testCommands = this.config.testSuites.map(suite => ({
      name: suite,
      command: `npx playwright test tests/performance/scenarios/${suite}.test.ts`,
      timeout: 600000 // 10 minutes per suite
    }));

    const reports: PerformanceReport[] = [];
    let allTestsSuccess = true;

    if (this.config.parallel) {
      // Run tests in parallel with concurrency limit
      const semaphore = new Array(this.config.maxConcurrency).fill(null);
      const testPromises: Promise<any>[] = [];

      for (const testCmd of testCommands) {
        const testPromise = this.executeTestCommand(testCmd.name, testCmd.command, testCmd.timeout)
          .then(result => {
            reports.push(result.report);
            if (!result.success) {
              allTestsSuccess = false;
            }
            return result;
          });
        
        testPromises.push(testPromise);
      }

      const results = await Promise.allSettled(testPromises);
      
      // Check for any rejected promises
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Test suite ${testCommands[index].name} failed:`, result.reason);
          allTestsSuccess = false;
        }
      });
    } else {
      // Run tests sequentially
      for (const testCmd of testCommands) {
        const result = await this.executeTestCommand(testCmd.name, testCmd.command, testCmd.timeout);
        reports.push(result.report);
        
        if (!result.success) {
          allTestsSuccess = false;
          
          if (this.config.failOnThreshold) {
            console.log('❌ Stopping execution due to test failure');
            break;
          }
        }
      }
    }

    return { success: allTestsSuccess, reports };
  }

  private async executeTestCommand(
    suiteName: string, 
    command: string, 
    timeout: number
  ): Promise<{
    success: boolean;
    report: PerformanceReport;
  }> {
    console.log(`🏃 Running ${suiteName}...`);
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout,
        env: {
          ...process.env,
          PERFORMANCE_TEST_ENVIRONMENT: this.config.environment,
          PERFORMANCE_TEST_SUITE: suiteName
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse test output for performance metrics
      const metrics = this.parseTestOutput(stdout, stderr);
      const passed = !stderr.includes('FAILED') && !stderr.includes('Error');

      const report: PerformanceReport = {
        testName: suiteName,
        startTime,
        endTime,
        duration,
        metrics,
        passed,
        errors: passed ? [] : [stderr],
        environment: this.config.environment
      };

      this.reporter.addReport(report);

      if (passed) {
        console.log(`✅ ${suiteName} completed in ${(duration / 1000).toFixed(1)}s`);
      } else {
        console.log(`❌ ${suiteName} failed after ${(duration / 1000).toFixed(1)}s`);
      }

      return { success: passed, report };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const report: PerformanceReport = {
        testName: suiteName,
        startTime,
        endTime,
        duration,
        metrics: [],
        passed: false,
        errors: [error.message],
        environment: this.config.environment
      };

      this.reporter.addReport(report);
      console.log(`❌ ${suiteName} failed with error: ${error.message}`);

      return { success: false, report };
    }
  }

  private parseTestOutput(stdout: string, stderr: string): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];
    const combinedOutput = stdout + stderr;

    // Parse performance metrics from test output
    const metricPatterns = [
      { name: 'dashboard_load_time', pattern: /Dashboard.*?(\d+\.?\d*)ms/gi, unit: 'ms' as const },
      { name: 'api_response_time', pattern: /API.*?(\d+\.?\d*)ms/gi, unit: 'ms' as const },
      { name: 'cache_hit_rate', pattern: /Cache.*?(\d+\.?\d*)%/gi, unit: 'percentage' as const },
      { name: 'error_rate', pattern: /Error rate.*?(\d+\.?\d*)%/gi, unit: 'percentage' as const },
      { name: 'throughput', pattern: /Throughput.*?(\d+\.?\d*) RPS/gi, unit: 'count' as const }
    ];

    for (const pattern of metricPatterns) {
      const matches = combinedOutput.matchAll(pattern.pattern);
      
      for (const match of matches) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          metrics.push({
            name: pattern.name,
            value,
            unit: pattern.unit,
            timestamp: Date.now(),
            threshold: this.getThreshold(pattern.name),
            passed: this.checkThreshold(pattern.name, value)
          });
        }
      }
    }

    return metrics;
  }

  private getThreshold(metricName: string): number | undefined {
    const thresholds = {
      'dashboard_load_time': defaultPerformanceConfig.targets.dashboardLoading,
      'api_response_time': defaultPerformanceConfig.targets.apiResponse,
      'cache_hit_rate': defaultPerformanceConfig.targets.cacheHitRate,
      'error_rate': defaultPerformanceConfig.thresholds.errorRate,
      'throughput': defaultPerformanceConfig.thresholds.throughput.rps
    };
    
    return thresholds[metricName];
  }

  private checkThreshold(metricName: string, value: number): boolean {
    const threshold = this.getThreshold(metricName);
    if (!threshold) return true;

    // For error rates, lower is better
    if (metricName.includes('error')) {
      return value <= threshold;
    }
    
    // For response times, lower is better
    if (metricName.includes('time')) {
      return value <= threshold;
    }
    
    // For rates and throughput, higher is better
    return value >= threshold;
  }

  private async generateReports(): Promise<string[]> {
    console.log('📊 Generating performance reports...');
    
    const reportDir = path.join(process.cwd(), 'test-results', 'performance');
    await fs.mkdir(reportDir, { recursive: true });
    
    const artifacts: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (this.config.reportFormats.includes('json')) {
      const jsonReport = this.reporter.exportToJSON();
      const jsonPath = path.join(reportDir, `performance-report-${timestamp}.json`);
      await fs.writeFile(jsonPath, jsonReport);
      artifacts.push(jsonPath);
      console.log(`✅ JSON report: ${jsonPath}`);
    }

    if (this.config.reportFormats.includes('html')) {
      const htmlReport = this.reporter.exportToHTML();
      const htmlPath = path.join(reportDir, `performance-report-${timestamp}.html`);
      await fs.writeFile(htmlPath, htmlReport);
      artifacts.push(htmlPath);
      console.log(`✅ HTML report: ${htmlPath}`);
    }

    if (this.config.reportFormats.includes('junit')) {
      const junitReport = this.generateJUnitReport();
      const junitPath = path.join(reportDir, `performance-junit-${timestamp}.xml`);
      await fs.writeFile(junitPath, junitReport);
      artifacts.push(junitPath);
      console.log(`✅ JUnit report: ${junitPath}`);
    }

    // Generate trend report if historical data exists
    await this.generateTrendReport(reportDir);

    console.log('✅ Report generation complete');
    return artifacts;
  }

  private generateJUnitReport(): string {
    const summary = this.reporter.generateSummaryReport();
    const reports = this.reporter['reports']; // Access private field for full reports
    
    const testSuites = reports.map(report => {
      const failures = report.errors.length;
      const tests = Math.max(1, report.metrics.length);
      
      return `
    <testsuite 
      name="${report.testName}" 
      tests="${tests}" 
      failures="${failures}" 
      time="${(report.duration / 1000).toFixed(3)}"
      timestamp="${new Date(report.startTime).toISOString()}"
    >
      ${report.metrics.map(metric => `
        <testcase 
          name="${metric.name}" 
          time="${(metric.value / 1000).toFixed(3)}"
          classname="${report.testName}"
        >
          ${!metric.passed ? `<failure message="Performance threshold exceeded">${metric.name}: ${metric.value}${metric.unit} > ${metric.threshold}${metric.unit}</failure>` : ''}
        </testcase>
      `).join('')}
      ${report.errors.map(error => `
        <testcase name="execution" classname="${report.testName}">
          <error message="Test execution failed">${error}</error>
        </testcase>
      `).join('')}
    </testsuite>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites 
  name="WedSync Performance Tests" 
  tests="${summary.totalTests}" 
  failures="${summary.failedTests}" 
  time="${(summary.totalDuration / 1000).toFixed(3)}"
>
  ${testSuites}
</testsuites>`;
  }

  private async generateTrendReport(reportDir: string): Promise<void> {
    try {
      // Read historical reports
      const files = await fs.readdir(reportDir);
      const jsonFiles = files.filter(f => f.startsWith('performance-report-') && f.endsWith('.json'));
      
      if (jsonFiles.length < 2) {
        console.log('📈 Insufficient historical data for trend analysis');
        return;
      }

      // Load recent reports for trend analysis
      const recentReports = await Promise.all(
        jsonFiles.slice(-10).map(async (file) => {
          const content = await fs.readFile(path.join(reportDir, file), 'utf8');
          return JSON.parse(content);
        })
      );

      const trendData = this.analyzeTrends(recentReports);
      const trendPath = path.join(reportDir, 'performance-trends.json');
      await fs.writeFile(trendPath, JSON.stringify(trendData, null, 2));
      
      console.log(`📈 Trend analysis: ${trendPath}`);
    } catch (error) {
      console.warn('⚠️ Trend report generation failed:', error.message);
    }
  }

  private analyzeTrends(reports: any[]): any {
    const metrics = ['dashboard_load_time', 'api_response_time', 'cache_hit_rate'];
    const trends: Record<string, any> = {};

    for (const metric of metrics) {
      const values = reports.flatMap(report => 
        report.reports?.flatMap(r => 
          r.metrics?.filter(m => m.name === metric).map(m => ({
            timestamp: r.startTime,
            value: m.value
          }))
        ) || []
      ).filter(Boolean);

      if (values.length >= 2) {
        const recent = values.slice(-5);
        const average = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
        const previousAverage = values.slice(-10, -5).reduce((sum, v) => sum + v.value, 0) / Math.min(5, values.length - 5);
        
        trends[metric] = {
          current: average,
          previous: previousAverage,
          trend: average > previousAverage ? 'increasing' : 'decreasing',
          change: ((average - previousAverage) / previousAverage * 100).toFixed(1) + '%'
        };
      }
    }

    return {
      generated: new Date().toISOString(),
      period: `${reports.length} recent test runs`,
      trends
    };
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    if (this.config.environment === 'local') {
      try {
        // Clean up test data
        await execAsync('npm run test:cleanup', { cwd: process.cwd() });
        console.log('✅ Test cleanup complete');
      } catch (error) {
        console.warn('⚠️ Test cleanup failed:', error.message);
      }
    }
  }

  private async sendNotifications(success: boolean, errorMessage?: string): Promise<void> {
    const summary = this.reporter.generateSummaryReport();
    const duration = Date.now() - this.startTime;
    
    const message = success 
      ? `✅ WedSync Performance Tests Passed\n\nSummary:\n- Tests: ${summary.passedTests}/${summary.totalTests} passed\n- Duration: ${(duration / 1000 / 60).toFixed(1)} minutes\n- Environment: ${this.config.environment}`
      : `❌ WedSync Performance Tests Failed\n\nSummary:\n- Tests: ${summary.passedTests}/${summary.totalTests} passed\n- Duration: ${(duration / 1000 / 60).toFixed(1)} minutes\n- Environment: ${this.config.environment}\n- Error: ${errorMessage || 'See logs for details'}`;

    // Slack notification
    if (this.config.slackChannel && this.config.webhookUrl) {
      try {
        await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: this.config.slackChannel,
            text: message,
            username: 'Performance Test Bot',
            icon_emoji: success ? ':white_check_mark:' : ':x:'
          })
        });
        console.log('📱 Slack notification sent');
      } catch (error) {
        console.warn('⚠️ Slack notification failed:', error.message);
      }
    }

    // Email notification (would integrate with email service)
    if (this.config.emailRecipients?.length) {
      console.log(`📧 Email notifications would be sent to: ${this.config.emailRecipients.join(', ')}`);
    }
  }

  private logSummary(summary: any): void {
    console.log('\n📊 Performance Test Summary:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 Tests:                ${summary.passedTests}/${summary.totalTests} passed`);
    console.log(`⏱️  Duration:             ${(summary.totalDuration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`🏃 Average Test Time:     ${(summary.averageDuration / 1000).toFixed(1)}s`);
    console.log(`🌐 Environment:          ${this.config.environment}`);
    
    if (summary.criticalFailures.length > 0) {
      console.log(`🚨 Critical Failures:    ${summary.criticalFailures.length}`);
      summary.criticalFailures.slice(0, 3).forEach(failure => {
        console.log(`   - ${failure}`);
      });
    }
    
    if (summary.performanceRegression) {
      console.log(`📉 Performance Regression: Detected`);
    } else {
      console.log(`📈 Performance Status:     Stable`);
    }
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  private getBaseUrl(): string {
    const urls = {
      local: 'http://localhost:3000',
      staging: 'https://staging.wedsync.com',
      production: 'https://wedsync.com'
    };
    
    return urls[this.config.environment] || urls.local;
  }
}

// CLI Integration
export async function runPerformanceTests(options: {
  environment?: string;
  suites?: string[];
  parallel?: boolean;
  reportFormats?: string[];
  webhookUrl?: string;
  slackChannel?: string;
} = {}) {
  const config: Partial<TestRunnerConfig> = {
    environment: (options.environment as any) || 'local',
    testSuites: options.suites || ['wedding-day-load', 'mobile-performance', 'api-performance'],
    parallel: options.parallel !== false,
    reportFormats: (options.reportFormats as any) || ['json', 'html'],
    webhookUrl: options.webhookUrl,
    slackChannel: options.slackChannel
  };

  const runner = new PerformanceTestRunner(config);
  
  try {
    const results = await runner.runAllTests();
    
    if (results.success) {
      console.log('\n🎉 All performance tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Performance tests failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💀 Performance test runner crashed:', error);
    process.exit(1);
  }
}

// Export for use in CI/CD
export default PerformanceTestRunner;