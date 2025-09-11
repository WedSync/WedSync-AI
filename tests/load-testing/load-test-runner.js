#!/usr/bin/env node

// Load Test Runner for WedSync Wedding Platform
// Orchestrates all wedding-specific load testing scenarios

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class WeddingLoadTestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.k6Binary = process.env.K6_BINARY || 'k6';
    
    // Test scenarios
    this.scenarios = [
      {
        name: 'Wedding Guest Management',
        file: 'wedding-guest-management.js',
        description: 'Tests guest list operations under peak load',
        priority: 'high',
        expectedDuration: '5-10 minutes',
      },
      {
        name: 'Wedding Vendor Coordination', 
        file: 'wedding-vendor-coordination.js',
        description: 'Tests vendor booking and communication systems',
        priority: 'high',
        expectedDuration: '5-10 minutes',
      },
      {
        name: 'Wedding Photo Upload',
        file: 'wedding-photo-upload.js', 
        description: 'Tests photo upload and media management',
        priority: 'medium',
        expectedDuration: '10-15 minutes',
      }
    ];
  }

  async runScenario(scenario, options = {}) {
    console.log(`\n🎯 Running: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    console.log(`⏱️  Expected Duration: ${scenario.expectedDuration}`);
    console.log(`🔗 Target URL: ${this.baseUrl}`);
    
    const testFile = path.join(__dirname, scenario.file);
    
    // Verify test file exists
    if (!fs.existsSync(testFile)) {
      throw new Error(`Test file not found: ${testFile}`);
    }
    
    // Build k6 command
    const k6Command = [
      this.k6Binary,
      'run',
      '--out', `json=${scenario.name.toLowerCase().replace(/\s+/g, '-')}-results.json`,
      '--summary-trend-stats', 'avg,min,med,max,p(90),p(95)',
      '--summary-time-unit', 'ms',
    ];
    
    // Add environment variables
    if (options.baseUrl) {
      k6Command.push('--env', `BASE_URL=${options.baseUrl}`);
    }
    
    // Add VU and duration overrides
    if (options.vus) {
      k6Command.push('--vus', options.vus.toString());
    }
    
    if (options.duration) {
      k6Command.push('--duration', options.duration);
    }
    
    k6Command.push(testFile);
    
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Executing: ${k6Command.join(' ')}`);
      const output = execSync(k6Command.join(' '), { 
        stdio: 'pipe',
        cwd: __dirname,
        timeout: 30 * 60 * 1000, // 30 minute timeout
      }).toString();
      
      const duration = Date.now() - startTime;
      const result = {
        scenario: scenario.name,
        status: 'passed',
        duration: duration,
        output: output,
        timestamp: new Date().toISOString(),
      };
      
      // Parse k6 results for key metrics
      this.parseK6Results(result, output);
      this.testResults.push(result);
      
      console.log(`✅ Completed: ${scenario.name} (${Math.round(duration/1000)}s)`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        scenario: scenario.name,
        status: 'failed',
        duration: duration,
        error: error.message,
        output: error.stdout?.toString() || '',
        timestamp: new Date().toISOString(),
      };
      
      this.testResults.push(result);
      console.log(`❌ Failed: ${scenario.name} - ${error.message}`);
      return result;
    }
  }

  parseK6Results(result, output) {
    // Extract key metrics from k6 output
    const lines = output.split('\n');
    const metrics = {};
    
    lines.forEach(line => {
      // Parse http_req_duration
      if (line.includes('http_req_duration')) {
        const match = line.match(/avg=([0-9.]+ms)/);
        if (match) {
          metrics.avgResponseTime = match[1];
        }
      }
      
      // Parse http_req_failed
      if (line.includes('http_req_failed')) {
        const match = line.match(/([0-9.]+%)/);
        if (match) {
          metrics.errorRate = match[1];
        }
      }
      
      // Parse http_reqs
      if (line.includes('http_reqs')) {
        const match = line.match(/([0-9.]+\/s)/);
        if (match) {
          metrics.requestRate = match[1];
        }
      }
      
      // Parse checks
      if (line.includes('checks')) {
        const match = line.match(/([0-9.]+%)/);
        if (match) {
          metrics.checksPass = match[1];
        }
      }
    });
    
    result.metrics = metrics;
  }

  async runAllScenarios(options = {}) {
    console.log('🎪 WedSync Wedding Platform Load Testing Suite');
    console.log('================================================');
    console.log(`📅 Started: ${new Date().toISOString()}`);
    console.log(`🎯 Target: ${options.baseUrl || this.baseUrl}`);
    console.log(`📊 Scenarios: ${this.scenarios.length}`);
    
    const results = [];
    
    for (const scenario of this.scenarios) {
      // Skip low priority tests in quick mode
      if (options.quick && scenario.priority !== 'high') {
        console.log(`⏭️  Skipping ${scenario.name} (quick mode)`);
        continue;
      }
      
      try {
        const result = await this.runScenario(scenario, options);
        results.push(result);
        
        // Wait between tests to avoid overwhelming the system
        if (options.delay && scenario !== this.scenarios[this.scenarios.length - 1]) {
          console.log(`⏸️  Waiting ${options.delay}ms before next test...`);
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        
      } catch (error) {
        console.error(`💥 Scenario failed: ${scenario.name}`, error);
        results.push({
          scenario: scenario.name,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return results;
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    
    console.log('\n📊 WEDDING LOAD TESTING REPORT');
    console.log('==============================');
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration/1000)}s`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests/(passedTests+failedTests))*100)}%`);
    
    console.log('\n🎯 SCENARIO RESULTS:');
    this.testResults.forEach(result => {
      console.log(`\n${result.status === 'passed' ? '✅' : '❌'} ${result.scenario}`);
      if (result.metrics) {
        console.log(`   📊 Avg Response: ${result.metrics.avgResponseTime || 'N/A'}`);
        console.log(`   🚨 Error Rate: ${result.metrics.errorRate || 'N/A'}`);
        console.log(`   📈 Request Rate: ${result.metrics.requestRate || 'N/A'}`);
        console.log(`   ✅ Checks Pass: ${result.metrics.checksPass || 'N/A'}`);
      }
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      }
    });

    // Save detailed report
    const reportPath = path.join(__dirname, `load-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        totalDuration,
        totalTests: this.testResults.length,
        passedTests,
        failedTests,
        successRate: Math.round((passedTests/(passedTests+failedTests))*100),
        timestamp: new Date().toISOString(),
      },
      results: this.testResults,
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    return reportPath;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new WeddingLoadTestRunner();
  
  const options = {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    quick: args.includes('--quick'),
    delay: args.includes('--delay') ? 5000 : 0,
  };
  
  // Parse additional options
  args.forEach((arg, index) => {
    if (arg === '--vus' && args[index + 1]) {
      options.vus = parseInt(args[index + 1]);
    }
    if (arg === '--duration' && args[index + 1]) {
      options.duration = args[index + 1];
    }
    if (arg === '--baseurl' && args[index + 1]) {
      options.baseUrl = args[index + 1];
    }
  });
  
  try {
    // Show help
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
🎪 WedSync Load Testing Runner

Usage: node load-test-runner.js [options]

Options:
  --quick           Run only high-priority tests
  --delay           Add 5s delay between tests  
  --vus <number>    Override virtual users
  --duration <time> Override test duration
  --baseurl <url>   Override target URL
  --help, -h        Show this help

Environment Variables:
  BASE_URL          Target application URL (default: http://localhost:3000)
  K6_BINARY         Path to k6 binary (default: k6)

Examples:
  node load-test-runner.js --quick
  node load-test-runner.js --vus 50 --duration 2m
  node load-test-runner.js --baseurl https://staging.wedsync.com
      `);
      process.exit(0);
    }
    
    console.log('🎯 Starting WedSync Load Testing...\n');
    
    await runner.runAllScenarios(options);
    const reportPath = runner.generateReport();
    
    console.log('\n🎉 Load testing completed successfully!');
    console.log(`📄 Report: ${reportPath}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Load testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { WeddingLoadTestRunner };