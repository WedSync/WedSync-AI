#!/usr/bin/env tsx

/**
 * WS-177 Audit Logging System - Team E Comprehensive Test Runner
 * 
 * This script executes the complete testing framework for the audit logging system:
 * - Unit tests for audit logger functionality
 * - Security penetration tests
 * - Performance and load tests
 * - GDPR/HIPAA/SOC2 compliance tests
 * - End-to-end integration tests
 * 
 * Usage: npm run test:audit:comprehensive
 */

import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  errors: string[];
}

interface TestSuite {
  name: string;
  description: string;
  command: string;
  timeout: number;
  critical: boolean;
}

class AuditTestRunner {
  private results: TestResult[] = [];
  private startTime: number = Date.now();
  private logFile: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, '../reports', `audit-test-run-${timestamp}.log`);
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory(): void {
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logMessage);
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    this.log(`\n🧪 Starting ${suite.name}...`);
    this.log(`Description: ${suite.description}`);
    this.log(`Command: ${suite.command}`);

    const startTime = Date.now();
    const result: TestResult = {
      suite: suite.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    };

    return new Promise((resolve) => {
      const child = spawn('npm', ['run', ...suite.command.split(' ').slice(1)], {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
        timeout: suite.timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        result.duration = duration;

        if (code === 0) {
          this.log(`✅ ${suite.name} completed successfully in ${duration}ms`);
          result.passed = this.parsePassedTests(stdout);
          result.failed = this.parseFailedTests(stdout);
          result.skipped = this.parseSkippedTests(stdout);
          result.coverage = this.parseCoverage(stdout);
        } else {
          this.log(`❌ ${suite.name} failed with code ${code} after ${duration}ms`);
          result.failed = 1;
          result.errors = [stderr || 'Test suite failed'];
        }

        resolve(result);
      });

      child.on('error', (error) => {
        this.log(`💥 ${suite.name} encountered error: ${error.message}`);
        result.failed = 1;
        result.errors = [error.message];
        result.duration = Date.now() - startTime;
        resolve(result);
      });
    });
  }

  private parsePassedTests(output: string): number {
    const match = output.match(/(\d+) passed/i);
    return match ? parseInt(match[1]) : 0;
  }

  private parseFailedTests(output: string): number {
    const match = output.match(/(\d+) failed/i);
    return match ? parseInt(match[1]) : 0;
  }

  private parseSkippedTests(output: string): number {
    const match = output.match(/(\d+) skipped/i);
    return match ? parseInt(match[1]) : 0;
  }

  private parseCoverage(output: string): number | undefined {
    const match = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : undefined;
  }

  private async runK6LoadTests(): Promise<TestResult> {
    this.log('\n🚀 Running K6 Load Tests...');
    const startTime = Date.now();

    try {
      const k6Script = path.join(__dirname, '../performance/k6-audit-load-test.js');
      const { stdout, stderr } = await execAsync(`k6 run ${k6Script}`, { timeout: 300000 });
      
      const duration = Date.now() - startTime;
      this.log(`✅ K6 load tests completed in ${duration}ms`);

      // Parse K6 results
      const result: TestResult = {
        suite: 'K6 Load Tests',
        passed: stdout.includes('✓') ? 1 : 0,
        failed: stdout.includes('✗') ? 1 : 0,
        skipped: 0,
        duration,
        errors: stderr ? [stderr] : []
      };

      return result;
    } catch (error: any) {
      this.log(`❌ K6 load tests failed: ${error.message}`);
      return {
        suite: 'K6 Load Tests',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    this.log('🔧 Setting up test environment...');

    // Ensure test database is clean
    try {
      await execAsync('npm run db:test:reset');
      this.log('✅ Test database reset complete');
    } catch (error: any) {
      this.log(`⚠️ Database reset warning: ${error.message}`);
    }

    // Start test services
    try {
      await execAsync('npm run services:test:start', { timeout: 30000 });
      this.log('✅ Test services started');
    } catch (error: any) {
      this.log(`⚠️ Service start warning: ${error.message}`);
    }

    // Install playwright browsers if needed
    try {
      await execAsync('npx playwright install', { timeout: 60000 });
      this.log('✅ Playwright browsers ready');
    } catch (error: any) {
      this.log(`⚠️ Playwright install warning: ${error.message}`);
    }
  }

  private async teardownTestEnvironment(): Promise<void> {
    this.log('🧹 Cleaning up test environment...');

    try {
      await execAsync('npm run services:test:stop');
      this.log('✅ Test services stopped');
    } catch (error: any) {
      this.log(`⚠️ Service stop warning: ${error.message}`);
    }
  }

  private generateTestReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    const totalTests = totalPassed + totalFailed + totalSkipped;

    const report = {
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        passRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0',
        totalDuration,
        timestamp: new Date().toISOString()
      },
      suites: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      },
      compliance: this.generateComplianceReport(),
      recommendations: this.generateRecommendations()
    };

    // Save detailed JSON report
    const reportPath = path.join(__dirname, '../reports', `audit-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    this.generateHumanReadableReport(report, reportPath);
    
    this.log(`\n📊 Test report saved to: ${reportPath}`);
  }

  private generateComplianceReport(): any {
    const complianceResults = this.results.filter(r => 
      r.suite.includes('GDPR') || 
      r.suite.includes('HIPAA') || 
      r.suite.includes('SOC2')
    );

    return {
      gdprCompliance: complianceResults.find(r => r.suite.includes('GDPR'))?.failed === 0,
      hipaaCompliance: complianceResults.find(r => r.suite.includes('HIPAA'))?.failed === 0,
      soc2Compliance: complianceResults.find(r => r.suite.includes('SOC2'))?.failed === 0,
      overallCompliance: complianceResults.every(r => r.failed === 0),
      complianceScore: complianceResults.length > 0 
        ? ((complianceResults.filter(r => r.failed === 0).length / complianceResults.length) * 100).toFixed(2)
        : '0'
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedSuites = this.results.filter(r => r.failed > 0);
    if (failedSuites.length > 0) {
      recommendations.push('Address failing test suites before deployment');
      failedSuites.forEach(suite => {
        recommendations.push(`- Fix issues in ${suite.suite}: ${suite.errors.join(', ')}`);
      });
    }

    const slowSuites = this.results.filter(r => r.duration > 60000); // > 1 minute
    if (slowSuites.length > 0) {
      recommendations.push('Optimize performance of slow test suites');
      slowSuites.forEach(suite => {
        recommendations.push(`- ${suite.suite} took ${(suite.duration / 1000).toFixed(2)}s`);
      });
    }

    const lowCoverageSuites = this.results.filter(r => r.coverage && r.coverage < 80);
    if (lowCoverageSuites.length > 0) {
      recommendations.push('Improve test coverage for the following suites');
      lowCoverageSuites.forEach(suite => {
        recommendations.push(`- ${suite.suite} has ${suite.coverage}% coverage`);
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passing with good coverage - ready for deployment!');
    }

    return recommendations;
  }

  private generateHumanReadableReport(report: any, reportPath: string): void {
    const summary = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                     WS-177 AUDIT SYSTEM TEST RESULTS                        ║
║                              Team E - Round 1                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 SUMMARY
├─ Total Tests: ${report.summary.totalTests}
├─ Passed: ${report.summary.passed} (${report.summary.passRate}%)
├─ Failed: ${report.summary.failed}
├─ Skipped: ${report.summary.skipped}
├─ Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s
└─ Timestamp: ${report.summary.timestamp}

🔒 COMPLIANCE STATUS
├─ GDPR Compliance: ${report.compliance.gdprCompliance ? '✅ PASS' : '❌ FAIL'}
├─ HIPAA Compliance: ${report.compliance.hipaaCompliance ? '✅ PASS' : '❌ FAIL'}
├─ SOC2 Compliance: ${report.compliance.soc2Compliance ? '✅ PASS' : '❌ FAIL'}
└─ Overall Score: ${report.compliance.complianceScore}%

📋 TEST SUITE RESULTS
${report.suites.map((suite: TestResult) => 
  `├─ ${suite.suite}: ${suite.failed === 0 ? '✅' : '❌'} ${suite.passed}P/${suite.failed}F/${suite.skipped}S (${(suite.duration / 1000).toFixed(2)}s)`
).join('\n')}

💡 RECOMMENDATIONS
${report.recommendations.map((rec: string) => `├─ ${rec}`).join('\n')}

🔗 DETAILED REPORT: ${reportPath}
`;

    console.log(summary);
    fs.writeFileSync(reportPath.replace('.json', '-summary.txt'), summary);
  }

  public async run(): Promise<void> {
    this.log('🚀 Starting WS-177 Audit System Comprehensive Test Suite');
    this.log('Team E - Round 1 Testing Framework');
    this.log('========================================');

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Define test suites in order of execution
      const testSuites: TestSuite[] = [
        {
          name: 'Unit Tests - Audit Logger',
          description: 'Core audit logger functionality tests',
          command: 'test __tests__/unit/audit/audit-logger.test.ts',
          timeout: 60000,
          critical: true
        },
        {
          name: 'Security Penetration Tests',
          description: 'Security vulnerabilities and penetration testing',
          command: 'test __tests__/security/audit-security.test.ts',
          timeout: 120000,
          critical: true
        },
        {
          name: 'Performance Tests',
          description: 'Performance benchmarks and optimization tests',
          command: 'test __tests__/performance/audit-performance.test.ts',
          timeout: 180000,
          critical: false
        },
        {
          name: 'GDPR Compliance Tests',
          description: 'GDPR privacy and data protection compliance',
          command: 'test __tests__/compliance/gdpr/gdpr-audit-compliance.test.ts',
          timeout: 120000,
          critical: true
        },
        {
          name: 'HIPAA Compliance Tests',
          description: 'HIPAA healthcare information compliance',
          command: 'test __tests__/compliance/hipaa/hipaa-audit-compliance.test.ts',
          timeout: 120000,
          critical: true
        },
        {
          name: 'SOC2 Compliance Tests',
          description: 'SOC2 security framework compliance',
          command: 'test __tests__/compliance/soc2/soc2-audit-compliance.test.ts',
          timeout: 120000,
          critical: true
        },
        {
          name: 'End-to-End Integration Tests',
          description: 'Full system integration and cross-team component tests',
          command: 'test:e2e __tests__/e2e/audit/audit-integration.spec.ts',
          timeout: 300000,
          critical: true
        }
      ];

      // Run all test suites
      for (const suite of testSuites) {
        const result = await this.runTestSuite(suite);
        this.results.push(result);

        // If critical test fails, consider stopping
        if (suite.critical && result.failed > 0) {
          this.log(`⚠️ Critical test suite ${suite.name} failed. Continuing but flagging for attention.`);
        }
      }

      // Run K6 load tests separately
      const k6Result = await this.runK6LoadTests();
      this.results.push(k6Result);

      // Generate comprehensive test report
      this.generateTestReport();

      // Final status
      const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
      const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);

      if (totalFailed === 0) {
        this.log('\n🎉 ALL TESTS PASSED! Audit system ready for deployment.');
        process.exit(0);
      } else {
        this.log(`\n⚠️ ${totalFailed} tests failed, ${totalPassed} tests passed. Review failures before deployment.`);
        process.exit(1);
      }

    } catch (error: any) {
      this.log(`💥 Test runner encountered fatal error: ${error.message}`);
      console.error(error);
      process.exit(1);
    } finally {
      await this.teardownTestEnvironment();
    }
  }
}

// Run the comprehensive test suite if called directly
if (require.main === module) {
  const runner = new AuditTestRunner();
  runner.run().catch((error) => {
    console.error('Fatal error in test runner:', error);
    process.exit(1);
  });
}

export { AuditTestRunner };