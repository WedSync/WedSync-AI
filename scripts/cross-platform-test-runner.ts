#!/usr/bin/env tsx
// Cross-platform test automation runner
// Orchestrates comprehensive testing across all devices and browsers
// Integrates with CI/CD for automated quality gates

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BROWSERSTACK_CONFIG, buildCapabilities, getTestEnvironment } from '../tests/cross-platform/browserstack.config';

interface TestResult {
  platform: string;
  browser: string;
  device?: string;
  os: string;
  testSuite: string;
  passed: number;
  failed: number;
  duration: number;
  screenshots: string[];
  errors: string[];
}

interface CrossPlatformTestReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  coverage: {
    devices: number;
    browsers: number;
    platforms: number;
  };
  results: TestResult[];
  summary: {
    criticalFailures: string[];
    performanceIssues: string[];
    visualRegressions: string[];
    accessibilityViolations: string[];
  };
}

// Test suites configuration for cross-platform execution
const TEST_SUITES = {
  'wedding-flows': {
    name: 'Wedding User Flows',
    path: 'tests/cross-platform/wedding-flows.cross-platform.spec.ts',
    priority: 'critical',
    timeout: 300000, // 5 minutes per platform
  },
  'visual-regression': {
    name: 'Visual Regression Testing',
    path: 'tests/visual/**/*.visual.spec.ts',
    priority: 'high',
    timeout: 180000, // 3 minutes per platform
  },
  'performance': {
    name: 'Performance Testing',
    path: 'tests/performance/**/*.performance.spec.ts',
    priority: 'high',
    timeout: 240000, // 4 minutes per platform
  },
  'accessibility': {
    name: 'Accessibility Testing',
    path: 'tests/accessibility/**/*.accessibility.spec.ts',
    priority: 'critical',
    timeout: 200000, // 3.5 minutes per platform
  }
};

class CrossPlatformTestRunner {
  private results: TestResult[] = [];
  private startTime: Date;
  private environment: string;
  
  constructor() {
    this.startTime = new Date();
    this.environment = getTestEnvironment();
  }

  async run(): Promise<CrossPlatformTestReport> {
    console.log('🚀 Starting Cross-Platform Test Suite for WedSync Wedding Platform');
    console.log(`Environment: ${this.environment}`);
    console.log(`Timestamp: ${this.startTime.toISOString()}`);
    
    // Setup test environment
    await this.setupEnvironment();
    
    // Execute tests by priority
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorityOrder) {
      const suitesForPriority = Object.entries(TEST_SUITES)
        .filter(([_, config]) => config.priority === priority);
      
      if (suitesForPriority.length > 0) {
        console.log(`\n📋 Executing ${priority.toUpperCase()} priority test suites...`);
        
        for (const [suiteKey, suiteConfig] of suitesForPriority) {
          await this.executeSuite(suiteKey, suiteConfig);
        }
      }
    }
    
    // Generate comprehensive report
    const report = await this.generateReport();
    
    // Save results
    await this.saveResults(report);
    
    // Check quality gates
    await this.checkQualityGates(report);
    
    return report;
  }

  private async setupEnvironment(): Promise<void> {
    console.log('⚙️ Setting up cross-platform test environment...');
    
    // Create necessary directories
    const dirs = [
      'test-results/cross-platform',
      'screenshots/cross-platform',
      'reports/cross-platform',
      'coverage/cross-platform'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Environment-specific setup
    if (this.environment === 'browserstack') {
      await this.setupBrowserStack();
    } else if (this.environment === 'ci') {
      await this.setupCI();
    } else {
      await this.setupLocal();
    }
  }

  private async setupBrowserStack(): Promise<void> {
    console.log('🌐 Setting up BrowserStack integration...');
    
    // Validate BrowserStack credentials
    if (!process.env.BROWSERSTACK_USERNAME || !process.env.BROWSERSTACK_ACCESS_KEY) {
      throw new Error('BrowserStack credentials not found. Please set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY');
    }
    
    // Test BrowserStack connection
    try {
      const response = await fetch(`https://api.browserstack.com/automate/plan.json`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.BROWSERSTACK_USERNAME}:${process.env.BROWSERSTACK_ACCESS_KEY}`).toString('base64')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`BrowserStack API error: ${response.status}`);
      }
      
      const plan = await response.json();
      console.log(`✅ BrowserStack connected. Plan: ${plan.automate_plan || 'Free'}`);
    } catch (error) {
      console.error('❌ BrowserStack connection failed:', error);
      throw error;
    }
  }

  private async setupCI(): Promise<void> {
    console.log('⚡ Setting up CI environment...');
    
    // CI-specific optimizations
    process.env.CI = 'true';
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = 'true';
    
    // Optimize for CI performance
    BROWSERSTACK_CONFIG.maxInstances = 3; // Reduce concurrent tests in CI
    
    console.log('✅ CI environment configured');
  }

  private async setupLocal(): Promise<void> {
    console.log('🏠 Setting up local testing environment...');
    
    // Install browsers if needed
    const { spawn } = await import('child_process');
    
    try {
      await new Promise((resolve, reject) => {
        const install = spawn('npx', ['playwright', 'install'], { stdio: 'inherit' });
        install.on('close', (code) => {
          if (code === 0) resolve(void 0);
          else reject(new Error(`Browser installation failed with code ${code}`));
        });
      });
      
      console.log('✅ Local browsers installed');
    } catch (error) {
      console.warn('⚠️  Browser installation warning:', error);
    }
  }

  private async executeSuite(suiteKey: string, suiteConfig: any): Promise<void> {
    console.log(`\n🧪 Executing test suite: ${suiteConfig.name}`);
    
    const capabilities = buildCapabilities('all');
    const batchSize = this.environment === 'ci' ? 2 : 5; // Smaller batches in CI
    
    // Execute tests in batches to manage resources
    for (let i = 0; i < capabilities.length; i += batchSize) {
      const batch = capabilities.slice(i, i + batchSize);
      
      console.log(`  📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(capabilities.length / batchSize)}`);
      
      const batchPromises = batch.map(capability => 
        this.runTestOnPlatform(suiteKey, suiteConfig, capability)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        } else {
          console.error(`❌ Test failed for ${batch[index].deviceName || batch[index].browserName}:`, result.reason);
          
          // Add failed result
          this.results.push({
            platform: batch[index].deviceName || 'desktop',
            browser: batch[index].browserName,
            device: batch[index].deviceName,
            os: batch[index].os || batch[index].osVersion,
            testSuite: suiteKey,
            passed: 0,
            failed: 1,
            duration: 0,
            screenshots: [],
            errors: [result.reason?.message || 'Unknown error']
          });
        }
      });
      
      // Brief pause between batches to prevent resource exhaustion
      if (i + batchSize < capabilities.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async runTestOnPlatform(suiteKey: string, suiteConfig: any, capability: any): Promise<TestResult> {
    const platformName = capability.deviceName || `${capability.browserName}-${capability.os}`;
    const startTime = Date.now();
    
    console.log(`    🔍 Testing on ${platformName}...`);
    
    try {
      // Construct Playwright command
      const command = this.environment === 'browserstack' 
        ? this.buildBrowserStackCommand(suiteConfig, capability)
        : this.buildLocalCommand(suiteConfig, capability);
      
      const result = await this.executePlaywrightTest(command, suiteConfig.timeout);
      
      const duration = Date.now() - startTime;
      
      console.log(`    ✅ ${platformName} completed in ${duration}ms`);
      
      return {
        platform: capability.deviceName || 'desktop',
        browser: capability.browserName,
        device: capability.deviceName,
        os: capability.os || capability.osVersion,
        testSuite: suiteKey,
        passed: result.passed,
        failed: result.failed,
        duration,
        screenshots: result.screenshots || [],
        errors: result.errors || []
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`    ❌ ${platformName} failed after ${duration}ms:`, error);
      
      throw error;
    }
  }

  private buildBrowserStackCommand(suiteConfig: any, capability: any): string[] {
    return [
      'npx', 'playwright', 'test',
      suiteConfig.path,
      '--project', capability.deviceName || capability.browserName,
      '--reporter', 'json',
      '--output-dir', `test-results/cross-platform/${capability.deviceName || capability.browserName}`
    ];
  }

  private buildLocalCommand(suiteConfig: any, capability: any): string[] {
    return [
      'npx', 'playwright', 'test',
      suiteConfig.path,
      '--project', capability.browserName || 'chromium',
      '--reporter', 'json',
      '--output-dir', `test-results/cross-platform/local`
    ];
  }

  private async executePlaywrightTest(command: string[], timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse Playwright JSON output
            const result = this.parsePlaywrightResults(stdout);
            resolve(result);
          } catch (error) {
            resolve({ passed: 0, failed: 1, errors: ['Failed to parse results'] });
          }
        } else {
          reject(new Error(`Test process exited with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  private parsePlaywrightResults(output: string): any {
    try {
      // Extract JSON from Playwright output
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          passed: result.stats?.expected || 0,
          failed: result.stats?.unexpected || 0,
          screenshots: result.screenshots || [],
          errors: result.errors || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse Playwright results:', error);
    }
    
    // Fallback parsing
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      screenshots: [],
      errors: []
    };
  }

  private async generateReport(): Promise<CrossPlatformTestReport> {
    const endTime = new Date();
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    
    // Calculate coverage metrics
    const uniqueDevices = new Set(this.results.map(r => r.device || 'desktop')).size;
    const uniqueBrowsers = new Set(this.results.map(r => r.browser)).size;
    const uniquePlatforms = new Set(this.results.map(r => r.platform)).size;
    
    // Analyze failures
    const criticalFailures = this.results
      .filter(r => r.failed > 0 && r.testSuite === 'wedding-flows')
      .map(r => `${r.platform} - ${r.browser}: ${r.errors.join(', ')}`);
    
    const performanceIssues = this.results
      .filter(r => r.duration > 30000) // Tests taking longer than 30s
      .map(r => `${r.platform} - ${r.browser}: ${r.duration}ms`);
    
    return {
      timestamp: endTime.toISOString(),
      environment: this.environment,
      totalTests,
      totalPassed,
      totalFailed,
      coverage: {
        devices: uniqueDevices,
        browsers: uniqueBrowsers,
        platforms: uniquePlatforms
      },
      results: this.results,
      summary: {
        criticalFailures,
        performanceIssues,
        visualRegressions: [], // Will be populated by visual comparison
        accessibilityViolations: [] // Will be populated by a11y tests
      }
    };
  }

  private async saveResults(report: CrossPlatformTestReport): Promise<void> {
    const timestamp = report.timestamp.replace(/[:.]/g, '-');
    const reportPath = `reports/cross-platform/cross-platform-report-${timestamp}.json`;
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = `reports/cross-platform/cross-platform-report-${timestamp}.html`;
    await fs.writeFile(htmlPath, htmlReport);
    
    console.log(`\n📊 Reports saved:`);
    console.log(`  📄 JSON: ${reportPath}`);
    console.log(`  🌐 HTML: ${htmlPath}`);
  }

  private generateHTMLReport(report: CrossPlatformTestReport): string {
    const passRate = ((report.totalPassed / report.totalTests) * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WedSync Cross-Platform Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
        .results-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .results-table th, .results-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .platform-tag { background: #6c757d; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 WedSync Cross-Platform Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: ${report.environment}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <div class="stat-number ${report.totalFailed === 0 ? 'passed' : 'failed'}">${passRate}%</div>
            <div>Pass Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${report.totalTests}</div>
            <div>Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${report.coverage.devices}</div>
            <div>Devices Tested</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${report.coverage.browsers}</div>
            <div>Browsers Tested</div>
        </div>
    </div>
    
    <h2>📱 Test Results by Platform</h2>
    <table class="results-table">
        <thead>
            <tr>
                <th>Platform</th>
                <th>Browser</th>
                <th>Test Suite</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Duration</th>
            </tr>
        </thead>
        <tbody>
            ${report.results.map(result => `
                <tr>
                    <td><span class="platform-tag">${result.platform}</span></td>
                    <td>${result.browser}</td>
                    <td>${result.testSuite}</td>
                    <td class="passed">${result.passed}</td>
                    <td class="failed">${result.failed}</td>
                    <td>${result.duration}ms</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    ${report.summary.criticalFailures.length > 0 ? `
    <h2>🚨 Critical Failures</h2>
    <ul>
        ${report.summary.criticalFailures.map(failure => `<li class="failed">${failure}</li>`).join('')}
    </ul>
    ` : '<h2 class="passed">✅ No Critical Failures</h2>'}
    
    ${report.summary.performanceIssues.length > 0 ? `
    <h2>⚡ Performance Issues</h2>
    <ul>
        ${report.summary.performanceIssues.map(issue => `<li>${issue}</li>`).join('')}
    </ul>
    ` : '<h2 class="passed">✅ No Performance Issues</h2>'}
</body>
</html>
    `;
  }

  private async checkQualityGates(report: CrossPlatformTestReport): Promise<void> {
    console.log('\n🚪 Checking Quality Gates...');
    
    const passRate = (report.totalPassed / report.totalTests) * 100;
    const criticalFailures = report.summary.criticalFailures.length;
    
    // Quality gate thresholds
    const QUALITY_GATES = {
      MIN_PASS_RATE: 95, // 95% minimum pass rate
      MAX_CRITICAL_FAILURES: 0, // Zero critical failures allowed
      MAX_PERFORMANCE_ISSUES: 2, // Maximum 2 performance issues
      MIN_DEVICE_COVERAGE: 8 // Minimum 8 devices tested
    };
    
    let gatesPassed = true;
    
    // Check pass rate
    if (passRate < QUALITY_GATES.MIN_PASS_RATE) {
      console.error(`❌ Pass rate (${passRate.toFixed(1)}%) below threshold (${QUALITY_GATES.MIN_PASS_RATE}%)`);
      gatesPassed = false;
    } else {
      console.log(`✅ Pass rate: ${passRate.toFixed(1)}%`);
    }
    
    // Check critical failures
    if (criticalFailures > QUALITY_GATES.MAX_CRITICAL_FAILURES) {
      console.error(`❌ Critical failures (${criticalFailures}) exceed threshold (${QUALITY_GATES.MAX_CRITICAL_FAILURES})`);
      gatesPassed = false;
    } else {
      console.log(`✅ Critical failures: ${criticalFailures}`);
    }
    
    // Check device coverage
    if (report.coverage.devices < QUALITY_GATES.MIN_DEVICE_COVERAGE) {
      console.error(`❌ Device coverage (${report.coverage.devices}) below threshold (${QUALITY_GATES.MIN_DEVICE_COVERAGE})`);
      gatesPassed = false;
    } else {
      console.log(`✅ Device coverage: ${report.coverage.devices} devices`);
    }
    
    if (gatesPassed) {
      console.log('\n🎉 All Quality Gates Passed! ✨');
      process.exit(0);
    } else {
      console.log('\n💥 Quality Gates Failed! 🚫');
      process.exit(1);
    }
  }
}

// CLI execution
async function main() {
  try {
    const runner = new CrossPlatformTestRunner();
    const report = await runner.run();
    
    console.log('\n📈 Cross-Platform Testing Summary:');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.totalPassed}`);
    console.log(`Failed: ${report.totalFailed}`);
    console.log(`Coverage: ${report.coverage.devices} devices, ${report.coverage.browsers} browsers`);
    
  } catch (error) {
    console.error('💥 Cross-platform testing failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CrossPlatformTestRunner, TestResult, CrossPlatformTestReport };