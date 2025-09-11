const fs = require('fs');
const path = require('path');

class AccuracyReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.accuracyResults = [];
  }

  onRunComplete(contexts, results) {
    // Generate comprehensive accuracy report
    const report = this.generateAccuracyReport(results);
    
    // Save to file if specified
    if (this.options.outputFile) {
      this.saveReport(report, this.options.outputFile);
    }
    
    // Output summary to console
    this.outputConsoleSummary(report);
  }

  generateAccuracyReport(results) {
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        testSuiteResults: {
          numTotalTests: results.numTotalTests,
          numPassedTests: results.numPassedTests,
          numFailedTests: results.numFailedTests,
          numPendingTests: results.numPendingTests,
          testRuntime: results.testResults.reduce((sum, result) => sum + (result.perfStats?.runtime || 0), 0)
        }
      },
      accuracyMetrics: this.calculateAccuracyMetrics(results),
      algorithmPerformance: this.analyzeAlgorithmPerformance(results),
      testCoverage: this.analyzeCoverage(results),
      recommendations: this.generateRecommendations(results)
    };

    return report;
  }

  calculateAccuracyMetrics(results) {
    // Extract accuracy data from test results
    let totalAccuracyTests = 0;
    let passedAccuracyTests = 0;
    let averageAccuracy = 0;
    const algorithmAccuracies = {};

    for (const testResult of results.testResults) {
      for (const assertionResult of testResult.testResults) {
        // Look for accuracy-specific tests
        if (assertionResult.title.includes('accuracy') || 
            assertionResult.title.includes('precision') ||
            assertionResult.title.includes('validation')) {
          
          totalAccuracyTests++;
          if (assertionResult.status === 'passed') {
            passedAccuracyTests++;
          }

          // Extract algorithm name from test title
          const algorithmMatch = assertionResult.title.match(/(\w+)\s+(algorithm|detection|optimization)/i);
          if (algorithmMatch) {
            const algorithmName = algorithmMatch[1];
            if (!algorithmAccuracies[algorithmName]) {
              algorithmAccuracies[algorithmName] = { tests: 0, passed: 0 };
            }
            algorithmAccuracies[algorithmName].tests++;
            if (assertionResult.status === 'passed') {
              algorithmAccuracies[algorithmName].passed++;
            }
          }
        }
      }
    }

    // Calculate algorithm accuracy rates
    const algorithmAccuracyRates = {};
    Object.entries(algorithmAccuracies).forEach(([algo, stats]) => {
      algorithmAccuracyRates[algo] = {
        accuracyRate: stats.passed / stats.tests,
        testCount: stats.tests,
        passedTests: stats.passed
      };
    });

    return {
      totalAccuracyTests,
      passedAccuracyTests,
      accuracyTestSuccessRate: totalAccuracyTests > 0 ? passedAccuracyTests / totalAccuracyTests : 0,
      algorithmAccuracyRates
    };
  }

  analyzeAlgorithmPerformance(results) {
    const performance = {
      conflictDetection: { accuracy: 0, avgTime: 0, tests: 0 },
      scheduleOptimization: { accuracy: 0, avgTime: 0, tests: 0 },
      resourceAllocation: { accuracy: 0, avgTime: 0, tests: 0 },
      dependencyResolution: { accuracy: 0, avgTime: 0, tests: 0 }
    };

    // Extract performance data from test titles and durations
    for (const testResult of results.testResults) {
      for (const assertionResult of testResult.testResults) {
        const duration = assertionResult.duration || 0;
        const passed = assertionResult.status === 'passed';
        
        if (assertionResult.title.includes('conflict detection')) {
          performance.conflictDetection.tests++;
          performance.conflictDetection.avgTime += duration;
          if (passed) performance.conflictDetection.accuracy++;
        } else if (assertionResult.title.includes('optimization')) {
          performance.scheduleOptimization.tests++;
          performance.scheduleOptimization.avgTime += duration;
          if (passed) performance.scheduleOptimization.accuracy++;
        } else if (assertionResult.title.includes('resource')) {
          performance.resourceAllocation.tests++;
          performance.resourceAllocation.avgTime += duration;
          if (passed) performance.resourceAllocation.accuracy++;
        } else if (assertionResult.title.includes('dependency')) {
          performance.dependencyResolution.tests++;
          performance.dependencyResolution.avgTime += duration;
          if (passed) performance.dependencyResolution.accuracy++;
        }
      }
    }

    // Calculate averages
    Object.keys(performance).forEach(algorithm => {
      const stats = performance[algorithm];
      if (stats.tests > 0) {
        stats.accuracy = stats.accuracy / stats.tests;
        stats.avgTime = stats.avgTime / stats.tests;
      }
    });

    return performance;
  }

  analyzeCoverage(results) {
    // Extract coverage information if available
    const coverageMap = results.coverageMap;
    if (!coverageMap) {
      return { message: 'No coverage data available' };
    }

    const summary = coverageMap.getCoverageSummary();
    return {
      statements: {
        total: summary.statements.total,
        covered: summary.statements.covered,
        percentage: summary.statements.pct
      },
      branches: {
        total: summary.branches.total,
        covered: summary.branches.covered,
        percentage: summary.branches.pct
      },
      functions: {
        total: summary.functions.total,
        covered: summary.functions.covered,
        percentage: summary.functions.pct
      },
      lines: {
        total: summary.lines.total,
        covered: summary.lines.covered,
        percentage: summary.lines.pct
      }
    };
  }

  generateRecommendations(results) {
    const recommendations = [];
    const metrics = this.calculateAccuracyMetrics(results);
    const performance = this.analyzeAlgorithmPerformance(results);

    // Accuracy-based recommendations
    if (metrics.accuracyTestSuccessRate < 0.9) {
      recommendations.push({
        type: 'accuracy',
        priority: 'high',
        message: `Accuracy test success rate is ${(metrics.accuracyTestSuccessRate * 100).toFixed(1)}% - aim for >90%`,
        suggestion: 'Review algorithm implementations and increase test coverage for edge cases'
      });
    }

    // Performance-based recommendations
    Object.entries(performance).forEach(([algorithm, stats]) => {
      if (stats.accuracy < 0.8 && stats.tests > 0) {
        recommendations.push({
          type: 'algorithm',
          priority: 'medium',
          message: `${algorithm} accuracy is ${(stats.accuracy * 100).toFixed(1)}% - below 80% threshold`,
          suggestion: `Optimize ${algorithm} algorithm or improve test data quality`
        });
      }
      
      if (stats.avgTime > 1000) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: `${algorithm} average execution time is ${stats.avgTime.toFixed(0)}ms - consider optimization`,
          suggestion: `Profile ${algorithm} for performance bottlenecks`
        });
      }
    });

    // Test coverage recommendations
    if (results.numFailedTests > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `${results.numFailedTests} tests failed - fix before production`,
        suggestion: 'Address all failing tests and add regression tests'
      });
    }

    return recommendations;
  }

  saveReport(report, outputFile) {
    try {
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
      console.log(`📊 Accuracy report saved to: ${outputFile}`);
    } catch (error) {
      console.error('Failed to save accuracy report:', error.message);
    }
  }

  outputConsoleSummary(report) {
    console.log('\n📊 ACCURACY TEST REPORT SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    
    const metrics = report.accuracyMetrics;
    console.log(`📈 Accuracy Tests: ${metrics.passedAccuracyTests}/${metrics.totalAccuracyTests} passed (${(metrics.accuracyTestSuccessRate * 100).toFixed(1)}%)`);
    
    console.log('\n🔍 Algorithm Performance:');
    Object.entries(report.algorithmPerformance).forEach(([algorithm, stats]) => {
      if (stats.tests > 0) {
        console.log(`  ${algorithm}: ${(stats.accuracy * 100).toFixed(1)}% accuracy, ${stats.avgTime.toFixed(0)}ms avg`);
      }
    });
    
    if (report.testCoverage.statements) {
      console.log(`\n📋 Code Coverage: ${report.testCoverage.statements.percentage.toFixed(1)}% statements, ${report.testCoverage.branches.percentage.toFixed(1)}% branches`);
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
      
      if (report.recommendations.length > 3) {
        console.log(`  ... and ${report.recommendations.length - 3} more (see full report)`);
      }
    } else {
      console.log('\n✅ All accuracy metrics meet targets!');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
  }
}

module.exports = AccuracyReporter;