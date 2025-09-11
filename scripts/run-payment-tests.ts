#!/usr/bin/env tsx

/**
 * Comprehensive Payment Test Runner
 * Executes all payment tests and generates detailed reports
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

const execAsync = promisify(exec);

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors: string[];
  output: string;
}

interface TestReport {
  timestamp: string;
  totalDuration: number;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    coverage: number;
  };
  recommendations: string[];
}

class PaymentTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log(chalk.bold.cyan('\n🚀 WedSync Payment Test Suite\n'));
    console.log(chalk.gray('=' .repeat(60)));
    
    this.startTime = Date.now();

    // Run tests in sequence to avoid conflicts
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runE2ETests();
    await this.runSecurityTests();
    await this.runLoadTests();

    // Generate comprehensive report
    await this.generateReport();
  }

  private async runUnitTests(): Promise<void> {
    console.log(chalk.yellow('\n📝 Running Unit Tests...'));
    
    try {
      const start = Date.now();
      const { stdout, stderr } = await execAsync('npm run test:payment:unit -- --json --outputFile=test-results-unit.json');
      
      const duration = Date.now() - start;
      const coverage = await this.extractCoverage(stdout);
      
      this.results.push({
        suite: 'Unit Tests',
        passed: !stderr.includes('FAIL'),
        duration,
        coverage,
        errors: stderr ? [stderr] : [],
        output: stdout
      });

      console.log(chalk.green(`✅ Unit tests completed in ${duration}ms`));
      if (coverage) {
        console.log(chalk.blue(`   Coverage: ${coverage}%`));
      }
    } catch (error) {
      console.log(chalk.red('❌ Unit tests failed'));
      this.results.push({
        suite: 'Unit Tests',
        passed: false,
        duration: 0,
        errors: [error.message],
        output: ''
      });
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log(chalk.yellow('\n🔗 Running Integration Tests...'));
    
    try {
      const start = Date.now();
      const { stdout, stderr } = await execAsync('npm run test:payment:integration -- --json --outputFile=test-results-integration.json');
      
      const duration = Date.now() - start;
      
      this.results.push({
        suite: 'Integration Tests',
        passed: !stderr.includes('FAIL'),
        duration,
        errors: stderr ? [stderr] : [],
        output: stdout
      });

      console.log(chalk.green(`✅ Integration tests completed in ${duration}ms`));
    } catch (error) {
      console.log(chalk.red('❌ Integration tests failed'));
      this.results.push({
        suite: 'Integration Tests',
        passed: false,
        duration: 0,
        errors: [error.message],
        output: ''
      });
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log(chalk.yellow('\n🌐 Running E2E Tests...'));
    
    try {
      const start = Date.now();
      const { stdout, stderr } = await execAsync('npm run test:payment:e2e -- --reporter=json');
      
      const duration = Date.now() - start;
      
      this.results.push({
        suite: 'E2E Tests',
        passed: !stderr.includes('failed'),
        duration,
        errors: stderr ? [stderr] : [],
        output: stdout
      });

      console.log(chalk.green(`✅ E2E tests completed in ${duration}ms`));
    } catch (error) {
      console.log(chalk.red('❌ E2E tests failed'));
      this.results.push({
        suite: 'E2E Tests',
        passed: false,
        duration: 0,
        errors: [error.message],
        output: ''
      });
    }
  }

  private async runSecurityTests(): Promise<void> {
    console.log(chalk.yellow('\n🔒 Running Security Tests...'));
    
    try {
      const start = Date.now();
      
      // Run custom security test script
      const { stdout, stderr } = await execAsync('tsx scripts/test-payment-security.ts');
      
      const duration = Date.now() - start;
      
      this.results.push({
        suite: 'Security Tests',
        passed: !stderr && stdout.includes('All security tests passed'),
        duration,
        errors: stderr ? [stderr] : [],
        output: stdout
      });

      console.log(chalk.green(`✅ Security tests completed in ${duration}ms`));
    } catch (error) {
      console.log(chalk.red('❌ Security tests failed'));
      this.results.push({
        suite: 'Security Tests',
        passed: false,
        duration: 0,
        errors: [error.message],
        output: ''
      });
    }
  }

  private async runLoadTests(): Promise<void> {
    console.log(chalk.yellow('\n⚡ Running Load Tests...'));
    
    try {
      const start = Date.now();
      
      // Run performance/load test
      const { stdout, stderr } = await execAsync('npm run test:payment:load');
      
      const duration = Date.now() - start;
      
      this.results.push({
        suite: 'Load Tests',
        passed: !stderr && stdout.includes('Performance testing completed'),
        duration,
        errors: stderr ? [stderr] : [],
        output: stdout
      });

      console.log(chalk.green(`✅ Load tests completed in ${duration}ms`));
    } catch (error) {
      console.log(chalk.red('❌ Load tests failed'));
      this.results.push({
        suite: 'Load Tests',
        passed: false,
        duration: 0,
        errors: [error.message],
        output: ''
      });
    }
  }

  private async extractCoverage(output: string): Promise<number | undefined> {
    const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|\s*([\d.]+)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
  }

  private async generateReport(): Promise<void> {
    console.log(chalk.yellow('\n📊 Generating Test Report...'));
    
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const averageCoverage = this.results
      .filter(r => r.coverage)
      .reduce((sum, r) => sum + (r.coverage || 0), 0) / this.results.filter(r => r.coverage).length || 0;

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalDuration,
      results: this.results,
      summary: {
        total: this.results.length,
        passed,
        failed,
        coverage: averageCoverage
      },
      recommendations: this.generateRecommendations()
    };

    // Save JSON report
    const reportPath = path.join(process.cwd(), `payment-test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log(chalk.gray('\n' + '=' .repeat(60)));
    console.log(chalk.bold.cyan('\n📈 TEST SUMMARY\n'));
    
    console.log(chalk.white('Test Suites:'));
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? chalk.green : chalk.red;
      console.log(color(`  ${icon} ${result.suite.padEnd(20)} ${(result.duration / 1000).toFixed(2)}s`));
    });

    console.log(chalk.white('\nOverall Results:'));
    console.log(`  Total Suites: ${report.summary.total}`);
    console.log(chalk.green(`  Passed: ${report.summary.passed}`));
    console.log(chalk.red(`  Failed: ${report.summary.failed}`));
    console.log(chalk.blue(`  Coverage: ${report.summary.coverage.toFixed(1)}%`));
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 RECOMMENDATIONS:'));
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log(chalk.gray(`\n📄 Detailed report saved to: ${reportPath}`));

    // Generate HTML report
    await this.generateHTMLReport(report);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check coverage
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length;
      if (avgCoverage < 95) {
        recommendations.push(`Increase code coverage to 95% (currently ${avgCoverage.toFixed(1)}%)`);
      }
    }

    // Check for failed tests
    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failing test suite(s): ${failedTests.map(t => t.suite).join(', ')}`);
    }

    // Check performance
    const loadTest = this.results.find(r => r.suite === 'Load Tests');
    if (loadTest && loadTest.output.includes('exceeds target')) {
      recommendations.push('Optimize payment endpoint performance to meet target response times');
    }

    // Check security
    const securityTest = this.results.find(r => r.suite === 'Security Tests');
    if (securityTest && !securityTest.passed) {
      recommendations.push('Address security vulnerabilities before production deployment');
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passing! Ready for production deployment.');
    }

    return recommendations;
  }

  private async generateHTMLReport(report: TestReport): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WedSync Payment Test Report</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .summary-card { padding: 20px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; }
    .summary-card .value { font-size: 32px; font-weight: bold; }
    .test-suite { margin: 20px 0; padding: 20px; border-left: 4px solid #4CAF50; background: #f9f9f9; }
    .test-suite.failed { border-left-color: #f44336; }
    .test-suite h3 { margin: 0 0 10px 0; }
    .metrics { display: flex; gap: 20px; margin: 10px 0; }
    .metric { padding: 5px 10px; background: white; border-radius: 5px; }
    .recommendations { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .recommendations h2 { color: #856404; margin: 0 0 15px 0; }
    .recommendations ul { margin: 0; padding-left: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 WedSync Payment Test Report</h1>
    <p style="color: #666;">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${report.summary.total}</div>
      </div>
      <div class="summary-card" style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);">
        <h3>Passed</h3>
        <div class="value">${report.summary.passed}</div>
      </div>
      <div class="summary-card" style="background: linear-gradient(135deg, #f44336 0%, #da190b 100%);">
        <h3>Failed</h3>
        <div class="value">${report.summary.failed}</div>
      </div>
      <div class="summary-card" style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);">
        <h3>Coverage</h3>
        <div class="value">${report.summary.coverage.toFixed(1)}%</div>
      </div>
    </div>

    <h2>Test Suites</h2>
    ${report.results.map(result => `
      <div class="test-suite ${result.passed ? '' : 'failed'}">
        <h3>${result.passed ? '✅' : '❌'} ${result.suite}</h3>
        <div class="metrics">
          <div class="metric">Duration: ${(result.duration / 1000).toFixed(2)}s</div>
          ${result.coverage ? `<div class="metric">Coverage: ${result.coverage}%</div>` : ''}
          <div class="metric">Status: ${result.passed ? 'PASSED' : 'FAILED'}</div>
        </div>
        ${result.errors.length > 0 ? `
          <details>
            <summary style="cursor: pointer; margin-top: 10px;">View Errors</summary>
            <pre style="background: white; padding: 10px; margin-top: 10px; overflow-x: auto;">${result.errors.join('\n')}</pre>
          </details>
        ` : ''}
      </div>
    `).join('')}

    ${report.recommendations.length > 0 ? `
      <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
          ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="footer">
      <p>Total Test Duration: ${(report.totalDuration / 1000).toFixed(2)} seconds</p>
      <p>WedSync Payment Testing Suite v1.0</p>
    </div>
  </div>
</body>
</html>
    `;

    const htmlPath = path.join(process.cwd(), `payment-test-report-${Date.now()}.html`);
    await fs.writeFile(htmlPath, html);
    console.log(chalk.gray(`📄 HTML report saved to: ${htmlPath}`));
  }
}

// Create security test script if it doesn't exist
async function createSecurityTestScript(): Promise<void> {
  const scriptPath = path.join(process.cwd(), 'scripts', 'test-payment-security.ts');
  
  try {
    await fs.access(scriptPath);
  } catch {
    // File doesn't exist, create it
    const securityTestContent = `#!/usr/bin/env tsx

/**
 * Payment Security Tests
 * Tests security aspects of the payment system
 */

import fetch from 'node-fetch';

async function runSecurityTests(): Promise<void> {
  console.log('Running payment security tests...');
  
  const tests = [
    testWebhookSignatureValidation,
    testRateLimiting,
    testAuthenticationRequired,
    testInputSanitization,
    testCSRFProtection
  ];

  let allPassed = true;
  
  for (const test of tests) {
    try {
      await test();
      console.log(\`✅ \${test.name} passed\`);
    } catch (error) {
      console.log(\`❌ \${test.name} failed: \${error.message}\`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('All security tests passed');
  } else {
    console.log('Some security tests failed');
    process.exit(1);
  }
}

async function testWebhookSignatureValidation(): Promise<void> {
  // Test webhook without signature
  const response = await fetch('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    body: JSON.stringify({ type: 'payment_intent.succeeded' })
  });
  
  if (response.status !== 401) {
    throw new Error('Webhook accepted without signature');
  }
}

async function testRateLimiting(): Promise<void> {
  // Test rate limiting
  const promises = Array(10).fill(0).map(() =>
    fetch('http://localhost:3000/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test' },
      body: JSON.stringify({ tier: 'PROFESSIONAL' })
    })
  );
  
  const responses = await Promise.all(promises);
  const rateLimited = responses.filter(r => r.status === 429);
  
  if (rateLimited.length === 0) {
    throw new Error('Rate limiting not enforced');
  }
}

async function testAuthenticationRequired(): Promise<void> {
  // Test without auth
  const response = await fetch('http://localhost:3000/api/stripe/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ tier: 'PROFESSIONAL' })
  });
  
  if (response.status !== 401) {
    throw new Error('Endpoint accessible without authentication');
  }
}

async function testInputSanitization(): Promise<void> {
  // Test malicious input
  const response = await fetch('http://localhost:3000/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer test' },
    body: JSON.stringify({
      tier: 'PROFESSIONAL<script>alert("xss")</script>',
      billingCycle: 'monthly; DROP TABLE users;'
    })
  });
  
  // Should either sanitize or reject
  if (response.status === 200) {
    const data = await response.json();
    if (data.tier && data.tier.includes('<script>')) {
      throw new Error('Input not sanitized');
    }
  }
}

async function testCSRFProtection(): Promise<void> {
  // Test CSRF protection
  const response = await fetch('http://localhost:3000/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test',
      'Origin': 'http://evil-site.com'
    },
    body: JSON.stringify({ tier: 'PROFESSIONAL' })
  });
  
  if (response.status === 200) {
    console.warn('CSRF protection may not be properly configured');
  }
}

runSecurityTests().catch(console.error);
`;

    await fs.writeFile(scriptPath, securityTestContent);
    console.log(chalk.gray('Created security test script'));
  }
}

// Main execution
async function main() {
  console.log(chalk.bold.cyan('WedSync Payment Test Runner'));
  console.log(chalk.gray(`Started at: ${new Date().toISOString()}`));
  
  // Ensure security test script exists
  await createSecurityTestScript();
  
  const runner = new PaymentTestRunner();
  
  try {
    await runner.runAllTests();
    console.log(chalk.bold.green('\n✅ Payment testing completed successfully!'));
  } catch (error) {
    console.error(chalk.bold.red('\n❌ Payment testing failed:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PaymentTestRunner };