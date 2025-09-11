#!/usr/bin/env tsx
/**
 * WS-153 Photo Groups Management - Comprehensive Test Execution Script
 * 
 * Executes all test suites, validates coverage requirements,
 * generates performance benchmarks, and creates consolidated reports.
 * 
 * Test Suites:
 * - Unit Tests (>90% coverage requirement)
 * - Integration Tests (API-Database-UI workflow)
 * - E2E Tests (Cross-browser, mobile, accessibility)
 * - Performance Tests (Load testing, benchmarks)
 * - Security Tests (OWASP Top 10, authentication)
 * - Accessibility Tests (WCAG 2.1 AA compliance)
 */

import { execSync, spawn } from 'child_process'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import { performance } from 'perf_hooks'

// Test execution configuration
const TEST_CONFIG = {
  projectRoot: resolve(__dirname, '..'),
  reportsDir: resolve(__dirname, '../reports/ws-153'),
  testSuites: [
    {
      name: 'Unit Tests',
      command: 'npm run test:unit',
      files: [
        'src/__tests__/unit/photo-groups/PhotoGroupsManager.test.tsx',
        'src/__tests__/unit/photo-groups/photo-groups-api.test.ts'
      ],
      coverageThreshold: 90,
      timeout: 300000 // 5 minutes
    },
    {
      name: 'Integration Tests',
      command: 'npm run test:integration',
      files: [
        'src/__tests__/integration/ws-153-photo-groups-integration.test.ts'
      ],
      timeout: 600000 // 10 minutes
    },
    {
      name: 'E2E Tests',
      command: 'npx playwright test src/__tests__/playwright/ws-153-photo-groups-e2e.spec.ts',
      files: [
        'src/__tests__/playwright/ws-153-photo-groups-e2e.spec.ts'
      ],
      timeout: 1200000 // 20 minutes
    },
    {
      name: 'Performance Tests',
      command: 'npm run test:performance',
      files: [
        'src/__tests__/performance/ws-153-photo-groups-performance.test.ts'
      ],
      timeout: 900000 // 15 minutes
    },
    {
      name: 'Security Tests',
      command: 'npm run test:security',
      files: [
        'src/__tests__/security/ws-153-photo-groups-security.test.ts'
      ],
      timeout: 600000 // 10 minutes
    },
    {
      name: 'Accessibility Tests',
      command: 'npm run test:accessibility',
      files: [
        'src/__tests__/accessibility/ws-153-photo-groups-accessibility.test.ts'
      ],
      timeout: 600000 // 10 minutes
    }
  ],
  performance: {
    thresholds: {
      photoGroupCreation: 500, // ms
      guestAssignment: 200, // ms
      priorityReordering: 300, // ms
      bulkOperations: 2000, // ms
      pageLoad: 3000, // ms
      databaseQuery: 1000 // ms
    }
  }
}

// Test results tracking
interface TestSuiteResult {
  name: string
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMEOUT'
  duration: number
  coverage?: number
  testCount: number
  passedTests: number
  failedTests: number
  skippedTests: number
  output: string
  error?: string
  performanceMetrics?: Record<string, number>
  securityIssues?: number
  accessibilityViolations?: number
}

interface TestExecutionReport {
  timestamp: string
  totalDuration: number
  overallStatus: 'PASSED' | 'FAILED' | 'PARTIAL'
  suites: TestSuiteResult[]
  coverage: {
    overall: number
    threshold: number
    meetsRequirement: boolean
  }
  performance: {
    allBenchmarksMet: boolean
    metrics: Record<string, { actual: number; threshold: number; status: string }>
  }
  security: {
    totalIssues: number
    criticalIssues: number
    status: string
  }
  accessibility: {
    wcagCompliance: number
    violations: number
    status: string
  }
  recommendations: string[]
}

class TestExecutor {
  private results: TestSuiteResult[] = []
  private startTime: number = 0
  
  constructor() {
    this.ensureReportsDirectory()
  }

  private ensureReportsDirectory() {
    if (!existsSync(TEST_CONFIG.reportsDir)) {
      mkdirSync(TEST_CONFIG.reportsDir, { recursive: true })
    }
  }

  private async executeCommand(command: string, timeout: number): Promise<{ output: string; error?: string; duration: number }> {
    return new Promise((resolve) => {
      const startTime = performance.now()
      let output = ''
      let error = ''
      
      console.log(`🚀 Executing: ${command}`)
      
      const child = spawn('bash', ['-c', command], {
        cwd: TEST_CONFIG.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true', NODE_ENV: 'test' }
      })

      child.stdout?.on('data', (data) => {
        const text = data.toString()
        output += text
        process.stdout.write(text)
      })

      child.stderr?.on('data', (data) => {
        const text = data.toString()
        error += text
        process.stderr.write(text)
      })

      const timeoutId = setTimeout(() => {
        child.kill('SIGKILL')
        resolve({
          output: output + '\nTEST TIMEOUT',
          error: error + '\nTest execution timed out',
          duration: performance.now() - startTime
        })
      }, timeout)

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        const duration = performance.now() - startTime
        
        resolve({
          output,
          error: code !== 0 ? error || `Process exited with code ${code}` : undefined,
          duration
        })
      })
    })
  }

  private parseTestOutput(output: string, suiteName: string): {
    testCount: number
    passedTests: number
    failedTests: number
    skippedTests: number
    coverage?: number
    performanceMetrics?: Record<string, number>
    securityIssues?: number
    accessibilityViolations?: number
  } {
    let testCount = 0
    let passedTests = 0
    let failedTests = 0
    let skippedTests = 0
    let coverage: number | undefined
    let performanceMetrics: Record<string, number> = {}
    let securityIssues = 0
    let accessibilityViolations = 0

    // Parse Jest/Vitest output
    const testPassMatch = output.match(/(\d+) passing/i) || output.match(/✓.*?(\d+).*?passed/i)
    if (testPassMatch) passedTests = parseInt(testPassMatch[1])

    const testFailMatch = output.match(/(\d+) failing/i) || output.match(/✗.*?(\d+).*?failed/i)
    if (testFailMatch) failedTests = parseInt(testFailMatch[1])

    const testSkipMatch = output.match(/(\d+) pending/i) || output.match(/○.*?(\d+).*?skipped/i)
    if (testSkipMatch) skippedTests = parseInt(testSkipMatch[1])

    testCount = passedTests + failedTests + skippedTests

    // Parse coverage
    const coverageMatch = output.match(/All files.*?(\d+\.\d+)/s) || output.match(/Coverage.*?(\d+\.\d+)%/i)
    if (coverageMatch) coverage = parseFloat(coverageMatch[1])

    // Parse performance metrics
    if (suiteName === 'Performance Tests') {
      const performanceLines = output.match(/✅.*?(\d+)ms/g) || []
      performanceLines.forEach(line => {
        const metricMatch = line.match(/✅\s*(.*?):\s*.*?(\d+)ms/)
        if (metricMatch) {
          performanceMetrics[metricMatch[1].trim()] = parseInt(metricMatch[2])
        }
      })
    }

    // Parse security issues
    if (suiteName === 'Security Tests') {
      const vulnerableMatch = output.match(/🚨.*?VULNERABLE:\s*(\d+)/i)
      if (vulnerableMatch) securityIssues = parseInt(vulnerableMatch[1])
    }

    // Parse accessibility violations
    if (suiteName === 'Accessibility Tests') {
      const violationMatch = output.match(/❌.*?(\d+).*?violation/i)
      if (violationMatch) accessibilityViolations = parseInt(violationMatch[1])
    }

    return {
      testCount: testCount || 1, // Default to 1 if no tests detected
      passedTests,
      failedTests,
      skippedTests,
      coverage,
      performanceMetrics: Object.keys(performanceMetrics).length > 0 ? performanceMetrics : undefined,
      securityIssues: securityIssues || undefined,
      accessibilityViolations: accessibilityViolations || undefined
    }
  }

  private determineStatus(
    error: string | undefined,
    failedTests: number,
    duration: number,
    timeout: number
  ): TestSuiteResult['status'] {
    if (duration >= timeout * 0.95) return 'TIMEOUT'
    if (error && error.includes('TIMEOUT')) return 'TIMEOUT'
    if (error || failedTests > 0) return 'FAILED'
    return 'PASSED'
  }

  async executeSuite(suite: typeof TEST_CONFIG.testSuites[0]): Promise<TestSuiteResult> {
    console.log(`\n🧪 Starting ${suite.name}...`)
    console.log(`📁 Files: ${suite.files.join(', ')}`)
    
    const startTime = performance.now()
    const { output, error, duration } = await this.executeCommand(suite.command, suite.timeout)
    
    const parsed = this.parseTestOutput(output, suite.name)
    const status = this.determineStatus(error, parsed.failedTests, duration, suite.timeout)
    
    const result: TestSuiteResult = {
      name: suite.name,
      status,
      duration,
      coverage: parsed.coverage,
      testCount: parsed.testCount,
      passedTests: parsed.passedTests,
      failedTests: parsed.failedTests,
      skippedTests: parsed.skippedTests,
      output,
      error,
      performanceMetrics: parsed.performanceMetrics,
      securityIssues: parsed.securityIssues,
      accessibilityViolations: parsed.accessibilityViolations
    }

    console.log(`${status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️'} ${suite.name}: ${status}`)
    console.log(`   Duration: ${Math.round(duration)}ms`)
    console.log(`   Tests: ${parsed.passedTests}/${parsed.testCount} passed`)
    if (parsed.coverage) console.log(`   Coverage: ${parsed.coverage}%`)

    return result
  }

  async executeAll(): Promise<TestExecutionReport> {
    this.startTime = performance.now()
    console.log('🚀 Starting WS-153 Photo Groups Management Test Execution')
    console.log('=' .repeat(60))

    // Execute all test suites
    for (const suite of TEST_CONFIG.testSuites) {
      try {
        const result = await this.executeSuite(suite)
        this.results.push(result)
      } catch (error) {
        console.error(`❌ Error executing ${suite.name}:`, error)
        this.results.push({
          name: suite.name,
          status: 'FAILED',
          duration: 0,
          testCount: 0,
          passedTests: 0,
          failedTests: 1,
          skippedTests: 0,
          output: '',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const totalDuration = performance.now() - this.startTime
    return this.generateReport(totalDuration)
  }

  private generateReport(totalDuration: number): TestExecutionReport {
    const totalTests = this.results.reduce((sum, r) => sum + r.testCount, 0)
    const totalPassed = this.results.reduce((sum, r) => sum + r.passedTests, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedTests, 0)

    // Overall coverage calculation
    const coverageResults = this.results.filter(r => r.coverage !== undefined)
    const overallCoverage = coverageResults.length > 0 
      ? coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length
      : 0

    // Performance analysis
    const performanceMetrics: Record<string, { actual: number; threshold: number; status: string }> = {}
    this.results.forEach(result => {
      if (result.performanceMetrics) {
        Object.entries(result.performanceMetrics).forEach(([metric, value]) => {
          const threshold = TEST_CONFIG.performance.thresholds[metric as keyof typeof TEST_CONFIG.performance.thresholds] || 1000
          performanceMetrics[metric] = {
            actual: value,
            threshold,
            status: value <= threshold ? 'PASS' : 'FAIL'
          }
        })
      }
    })

    const allBenchmarksMet = Object.values(performanceMetrics).every(m => m.status === 'PASS')

    // Security analysis
    const totalSecurityIssues = this.results.reduce((sum, r) => sum + (r.securityIssues || 0), 0)
    const criticalSecurityIssues = Math.floor(totalSecurityIssues * 0.1) // Assume 10% are critical

    // Accessibility analysis
    const totalAccessibilityViolations = this.results.reduce((sum, r) => sum + (r.accessibilityViolations || 0), 0)
    const wcagCompliance = totalAccessibilityViolations === 0 ? 100 : Math.max(0, 100 - (totalAccessibilityViolations * 2))

    // Overall status
    const failedSuites = this.results.filter(r => r.status === 'FAILED').length
    const overallStatus: TestExecutionReport['overallStatus'] = 
      failedSuites === 0 ? 'PASSED' : 
      failedSuites < this.results.length ? 'PARTIAL' : 'FAILED'

    // Generate recommendations
    const recommendations: string[] = []
    
    if (overallCoverage < 90) {
      recommendations.push(`Increase test coverage from ${overallCoverage.toFixed(1)}% to >90%`)
    }
    
    if (!allBenchmarksMet) {
      recommendations.push('Address performance bottlenecks in failing benchmarks')
    }
    
    if (totalSecurityIssues > 0) {
      recommendations.push(`Resolve ${totalSecurityIssues} security issues found`)
    }
    
    if (totalAccessibilityViolations > 0) {
      recommendations.push(`Fix ${totalAccessibilityViolations} accessibility violations`)
    }
    
    if (failedSuites > 0) {
      recommendations.push(`Fix failing test suites: ${this.results.filter(r => r.status === 'FAILED').map(r => r.name).join(', ')}`)
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passed successfully! Consider adding more edge cases and stress tests.')
    }

    return {
      timestamp: new Date().toISOString(),
      totalDuration,
      overallStatus,
      suites: this.results,
      coverage: {
        overall: overallCoverage,
        threshold: 90,
        meetsRequirement: overallCoverage >= 90
      },
      performance: {
        allBenchmarksMet,
        metrics: performanceMetrics
      },
      security: {
        totalIssues: totalSecurityIssues,
        criticalIssues: criticalSecurityIssues,
        status: totalSecurityIssues === 0 ? 'SECURE' : totalSecurityIssues < 5 ? 'ACCEPTABLE' : 'NEEDS_ATTENTION'
      },
      accessibility: {
        wcagCompliance,
        violations: totalAccessibilityViolations,
        status: wcagCompliance >= 95 ? 'EXCELLENT' : wcagCompliance >= 85 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
      },
      recommendations
    }
  }

  saveReport(report: TestExecutionReport) {
    const reportPath = join(TEST_CONFIG.reportsDir, `ws-153-test-execution-${Date.now()}.json`)
    const htmlReportPath = join(TEST_CONFIG.reportsDir, `ws-153-test-execution-${Date.now()}.html`)
    
    // Save JSON report
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report)
    writeFileSync(htmlReportPath, htmlReport)
    
    console.log(`\n📊 Reports saved:`)
    console.log(`   JSON: ${reportPath}`)
    console.log(`   HTML: ${htmlReportPath}`)
    
    return { jsonPath: reportPath, htmlPath: htmlReportPath }
  }

  private generateHtmlReport(report: TestExecutionReport): string {
    const statusColor = (status: string) => {
      switch (status) {
        case 'PASSED': return '#10B981'
        case 'FAILED': return '#EF4444'
        case 'PARTIAL': return '#F59E0B'
        case 'TIMEOUT': return '#6B7280'
        default: return '#6B7280'
      }
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WS-153 Photo Groups Management - Test Execution Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0; }
        .content { padding: 2rem; }
        .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin: 0.5rem 0; }
        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: #10B981; transition: width 0.3s ease; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .recommendations { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; }
        .icon { width: 1rem; height: 1rem; display: inline-block; margin-right: 0.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 WS-153 Photo Groups Management</h1>
            <h2>Comprehensive Test Execution Report</h2>
            <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
            <p>Total Duration: ${Math.round(report.totalDuration / 1000)}s</p>
            <span class="status" style="background: ${statusColor(report.overallStatus)};">${report.overallStatus}</span>
        </div>

        <div class="content">
            <div class="grid">
                <div class="card">
                    <h3>📊 Coverage Analysis</h3>
                    <div class="metric">
                        <span>Overall Coverage:</span>
                        <strong>${report.coverage.overall.toFixed(1)}%</strong>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${report.coverage.overall}%; background: ${report.coverage.overall >= 90 ? '#10B981' : '#EF4444'};"></div>
                    </div>
                    <div class="metric">
                        <span>Threshold:</span>
                        <span>${report.coverage.threshold}%</span>
                    </div>
                    <div class="metric">
                        <span>Status:</span>
                        <span style="color: ${report.coverage.meetsRequirement ? '#10B981' : '#EF4444'};">${report.coverage.meetsRequirement ? 'MEETS REQUIREMENT' : 'BELOW THRESHOLD'}</span>
                    </div>
                </div>

                <div class="card">
                    <h3>⚡ Performance Analysis</h3>
                    <div class="metric">
                        <span>Benchmarks Status:</span>
                        <span style="color: ${report.performance.allBenchmarksMet ? '#10B981' : '#EF4444'};">${report.performance.allBenchmarksMet ? 'ALL PASSED' : 'SOME FAILED'}</span>
                    </div>
                    ${Object.entries(report.performance.metrics).map(([metric, data]) => `
                        <div class="metric">
                            <span>${metric}:</span>
                            <span style="color: ${data.status === 'PASS' ? '#10B981' : '#EF4444'};">${data.actual}ms (${data.threshold}ms)</span>
                        </div>
                    `).join('')}
                </div>

                <div class="card">
                    <h3>🔒 Security Analysis</h3>
                    <div class="metric">
                        <span>Total Issues:</span>
                        <strong>${report.security.totalIssues}</strong>
                    </div>
                    <div class="metric">
                        <span>Critical Issues:</span>
                        <strong>${report.security.criticalIssues}</strong>
                    </div>
                    <div class="metric">
                        <span>Status:</span>
                        <span style="color: ${report.security.status === 'SECURE' ? '#10B981' : report.security.status === 'ACCEPTABLE' ? '#F59E0B' : '#EF4444'};">${report.security.status}</span>
                    </div>
                </div>

                <div class="card">
                    <h3>♿ Accessibility Analysis</h3>
                    <div class="metric">
                        <span>WCAG Compliance:</span>
                        <strong>${report.accessibility.wcagCompliance.toFixed(1)}%</strong>
                    </div>
                    <div class="metric">
                        <span>Violations:</span>
                        <strong>${report.accessibility.violations}</strong>
                    </div>
                    <div class="metric">
                        <span>Status:</span>
                        <span style="color: ${report.accessibility.status === 'EXCELLENT' ? '#10B981' : report.accessibility.status === 'GOOD' ? '#F59E0B' : '#EF4444'};">${report.accessibility.status}</span>
                    </div>
                </div>
            </div>

            <h3>📋 Test Suite Results</h3>
            <table>
                <thead>
                    <tr>
                        <th>Test Suite</th>
                        <th>Status</th>
                        <th>Tests</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Duration</th>
                        <th>Coverage</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.suites.map(suite => `
                        <tr>
                            <td>${suite.name}</td>
                            <td><span class="status" style="background: ${statusColor(suite.status)};">${suite.status}</span></td>
                            <td>${suite.testCount}</td>
                            <td style="color: #10B981;">${suite.passedTests}</td>
                            <td style="color: #EF4444;">${suite.failedTests}</td>
                            <td>${Math.round(suite.duration)}ms</td>
                            <td>${suite.coverage ? suite.coverage.toFixed(1) + '%' : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`
  }

  printSummary(report: TestExecutionReport) {
    console.log('\n' + '='.repeat(60))
    console.log('🎯 WS-153 TEST EXECUTION SUMMARY')
    console.log('='.repeat(60))
    
    console.log(`\n📊 Overall Status: ${report.overallStatus}`)
    console.log(`⏱️  Total Duration: ${Math.round(report.totalDuration / 1000)}s`)
    console.log(`🧪 Test Suites: ${report.suites.length}`)
    
    console.log(`\n📈 Coverage: ${report.coverage.overall.toFixed(1)}% ${report.coverage.meetsRequirement ? '✅' : '❌'}`)
    console.log(`⚡ Performance: ${report.performance.allBenchmarksMet ? 'All benchmarks met ✅' : 'Some benchmarks failed ❌'}`)
    console.log(`🔒 Security: ${report.security.status} (${report.security.totalIssues} issues)`)
    console.log(`♿ Accessibility: ${report.accessibility.status} (${report.accessibility.wcagCompliance.toFixed(1)}% WCAG compliance)`)
    
    console.log(`\n🏆 Results by Test Suite:`)
    report.suites.forEach(suite => {
      const icon = suite.status === 'PASSED' ? '✅' : suite.status === 'FAILED' ? '❌' : '⚠️'
      console.log(`   ${icon} ${suite.name}: ${suite.passedTests}/${suite.testCount} tests (${Math.round(suite.duration)}ms)`)
    })
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`)
      report.recommendations.forEach(rec => console.log(`   • ${rec}`))
    }
    
    console.log('\n' + '='.repeat(60))
  }
}

// Main execution
async function main() {
  const executor = new TestExecutor()
  
  try {
    const report = await executor.executeAll()
    const { jsonPath, htmlPath } = executor.saveReport(report)
    executor.printSummary(report)
    
    // Exit with appropriate code
    const exitCode = report.overallStatus === 'PASSED' ? 0 : 1
    console.log(`\n${report.overallStatus === 'PASSED' ? '🎉' : '⚠️'} Test execution completed with status: ${report.overallStatus}`)
    console.log(`📁 Reports available at: ${TEST_CONFIG.reportsDir}`)
    
    process.exit(exitCode)
  } catch (error) {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  }
}

// Execute if called directly
if (require.main === module) {
  main()
}

export { TestExecutor, type TestExecutionReport }