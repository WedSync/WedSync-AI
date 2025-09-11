import { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import path from 'path';
import fs from 'fs';

interface BrowserTestResult {
  browser: string;
  project: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
  features: {
    dragDrop: boolean;
    responsiveDesign: boolean;
    cssAnimations: boolean;
    keyboardNavigation: boolean;
    touchEvents: boolean;
  };
}

class CrossBrowserReporter implements Reporter {
  private browserResults: Map<string, BrowserTestResult> = new Map();
  private startTime: number = 0;
  private outputDir: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputDir = options.outputFile || path.join(process.cwd(), 'test-results', 'cross-browser');
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    console.log('🌐 Starting Cross-Browser Compatibility Testing...');
    console.log(`📁 Results will be saved to: ${this.outputDir}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const projectName = test.parent.project()?.name || 'unknown';
    const browserName = this.extractBrowserName(projectName);
    
    if (!this.browserResults.has(browserName)) {
      this.browserResults.set(browserName, {
        browser: browserName,
        project: projectName,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        errors: [],
        features: {
          dragDrop: false,
          responsiveDesign: false,
          cssAnimations: false,
          keyboardNavigation: false,
          touchEvents: false
        }
      });
    }

    const browserResult = this.browserResults.get(browserName)!;
    browserResult.duration += result.duration;

    // Update test counts
    if (result.status === 'passed') {
      browserResult.passed++;
    } else if (result.status === 'failed') {
      browserResult.failed++;
      if (result.error) {
        browserResult.errors.push(`${test.title}: ${result.error.message}`);
      }
    } else if (result.status === 'skipped') {
      browserResult.skipped++;
    }

    // Track feature testing
    this.updateFeatureTracking(browserResult, test.title);
  }

  onEnd(result: FullResult) {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const report = this.generateReport(totalDuration, result);
    
    // Save detailed JSON report
    const jsonReportPath = path.join(this.outputDir, 'cross-browser-detailed-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
    
    // Save CSV summary for easy analysis
    const csvReportPath = path.join(this.outputDir, 'cross-browser-summary.csv');
    this.generateCsvReport(csvReportPath);
    
    // Print console summary
    this.printConsoleSummary(report);
    
    console.log(`📊 Detailed report saved to: ${jsonReportPath}`);
    console.log(`📈 CSV summary saved to: ${csvReportPath}`);
  }

  private extractBrowserName(projectName: string): string {
    if (projectName.includes('chromium') || projectName.includes('chrome')) return 'chromium';
    if (projectName.includes('firefox')) return 'firefox';
    if (projectName.includes('webkit') || projectName.includes('safari')) return 'webkit';
    if (projectName.includes('edge')) return 'edge';
    return 'unknown';
  }

  private updateFeatureTracking(browserResult: BrowserTestResult, testTitle: string) {
    const title = testTitle.toLowerCase();
    
    if (title.includes('drag') || title.includes('drop')) {
      browserResult.features.dragDrop = true;
    }
    if (title.includes('viewport') || title.includes('responsive')) {
      browserResult.features.responsiveDesign = true;
    }
    if (title.includes('css') || title.includes('animation')) {
      browserResult.features.cssAnimations = true;
    }
    if (title.includes('keyboard') || title.includes('navigation')) {
      browserResult.features.keyboardNavigation = true;
    }
    if (title.includes('touch')) {
      browserResult.features.touchEvents = true;
    }
  }

  private generateReport(totalDuration: number, result: FullResult) {
    const browserSummaries = Array.from(this.browserResults.values());
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalDuration: totalDuration,
        totalTests: result.stats.expected + result.stats.unexpected,
        totalPassed: result.stats.passed,
        totalFailed: result.stats.failed,
        totalSkipped: result.stats.skipped
      },
      browserResults: browserSummaries,
      compatibility: {
        fullySupported: this.calculateFullySupported(browserSummaries),
        partiallySupported: this.calculatePartiallySupported(browserSummaries),
        unsupported: this.calculateUnsupported(browserSummaries)
      },
      features: this.analyzeFeatureSupport(browserSummaries),
      recommendations: this.generateRecommendations(browserSummaries),
      issues: this.identifyIssues(browserSummaries)
    };
    
    return report;
  }

  private calculateFullySupported(browsers: BrowserTestResult[]): string[] {
    return browsers
      .filter(b => b.failed === 0 && b.passed > 0)
      .map(b => b.browser);
  }

  private calculatePartiallySupported(browsers: BrowserTestResult[]): string[] {
    return browsers
      .filter(b => b.failed > 0 && b.passed > 0)
      .map(b => b.browser);
  }

  private calculateUnsupported(browsers: BrowserTestResult[]): string[] {
    return browsers
      .filter(b => b.passed === 0 || (b.failed > b.passed))
      .map(b => b.browser);
  }

  private analyzeFeatureSupport(browsers: BrowserTestResult[]) {
    const features = ['dragDrop', 'responsiveDesign', 'cssAnimations', 'keyboardNavigation', 'touchEvents'];
    const featureSupport: any = {};
    
    features.forEach(feature => {
      featureSupport[feature] = {
        supported: browsers.filter(b => b.features[feature as keyof typeof b.features]).map(b => b.browser),
        total: browsers.length,
        percentage: (browsers.filter(b => b.features[feature as keyof typeof b.features]).length / browsers.length) * 100
      };
    });
    
    return featureSupport;
  }

  private generateRecommendations(browsers: BrowserTestResult[]): string[] {
    const recommendations: string[] = [];
    
    // Check for failing browsers
    const failingBrowsers = browsers.filter(b => b.failed > 0);
    if (failingBrowsers.length > 0) {
      recommendations.push(`Address test failures in: ${failingBrowsers.map(b => b.browser).join(', ')}`);
    }
    
    // Check for missing feature support
    const features = ['dragDrop', 'responsiveDesign', 'cssAnimations', 'keyboardNavigation'];
    features.forEach(feature => {
      const supportCount = browsers.filter(b => b.features[feature as keyof typeof b.features]).length;
      if (supportCount < browsers.length) {
        recommendations.push(`Improve ${feature} support across all browsers`);
      }
    });
    
    // Performance recommendations
    const slowBrowsers = browsers.filter(b => b.duration / b.passed > 5000); // More than 5s per test
    if (slowBrowsers.length > 0) {
      recommendations.push(`Optimize performance for: ${slowBrowsers.map(b => b.browser).join(', ')}`);
    }
    
    // General recommendations
    if (browsers.length < 3) {
      recommendations.push('Test on all major browsers: Chrome, Firefox, and Safari');
    }
    
    return recommendations;
  }

  private identifyIssues(browsers: BrowserTestResult[]) {
    const issues: any[] = [];
    
    browsers.forEach(browser => {
      if (browser.errors.length > 0) {
        issues.push({
          browser: browser.browser,
          type: 'test-failures',
          count: browser.errors.length,
          samples: browser.errors.slice(0, 3) // First 3 errors
        });
      }
      
      if (browser.passed === 0 && browser.failed > 0) {
        issues.push({
          browser: browser.browser,
          type: 'complete-failure',
          message: 'All tests failed - possible browser compatibility issue'
        });
      }
    });
    
    return issues;
  }

  private generateCsvReport(csvPath: string) {
    const headers = [
      'Browser', 'Project', 'Passed', 'Failed', 'Skipped', 
      'Duration (ms)', 'Success Rate (%)', 'Drag Drop', 'Responsive', 
      'CSS Animations', 'Keyboard Nav', 'Touch Events'
    ];
    
    const rows = Array.from(this.browserResults.values()).map(result => [
      result.browser,
      result.project,
      result.passed.toString(),
      result.failed.toString(),
      result.skipped.toString(),
      result.duration.toString(),
      ((result.passed / (result.passed + result.failed)) * 100).toFixed(1),
      result.features.dragDrop ? 'Yes' : 'No',
      result.features.responsiveDesign ? 'Yes' : 'No',
      result.features.cssAnimations ? 'Yes' : 'No',
      result.features.keyboardNavigation ? 'Yes' : 'No',
      result.features.touchEvents ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    fs.writeFileSync(csvPath, csvContent);
  }

  private printConsoleSummary(report: any) {
    console.log('\n🌐 CROSS-BROWSER COMPATIBILITY RESULTS');
    console.log('═══════════════════════════════════════════════');
    
    console.log('\n📊 Overall Results:');
    console.log(`  Total Tests: ${report.metadata.totalTests}`);
    console.log(`  Total Passed: ${report.metadata.totalPassed}`);
    console.log(`  Total Failed: ${report.metadata.totalFailed}`);
    console.log(`  Duration: ${(report.metadata.totalDuration / 1000).toFixed(2)}s`);
    
    console.log('\n🔍 Browser Results:');
    report.browserResults.forEach((result: BrowserTestResult) => {
      const successRate = result.passed + result.failed > 0 
        ? ((result.passed / (result.passed + result.failed)) * 100).toFixed(1)
        : '0.0';
      const status = result.failed === 0 ? '✅' : '❌';
      console.log(`  ${status} ${result.browser}: ${result.passed}/${result.passed + result.failed} (${successRate}%)`);
    });
    
    console.log('\n🎯 Feature Support:');
    Object.entries(report.features).forEach(([feature, support]: [string, any]) => {
      const percentage = support.percentage.toFixed(1);
      const status = support.percentage === 100 ? '✅' : support.percentage >= 75 ? '⚠️' : '❌';
      console.log(`  ${status} ${feature}: ${percentage}% (${support.supported.length}/${support.total} browsers)`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec: string) => {
        console.log(`  • ${rec}`);
      });
    }
    
    if (report.issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      report.issues.forEach((issue: any) => {
        console.log(`  • ${issue.browser}: ${issue.type}`);
      });
    }
    
    console.log('═══════════════════════════════════════════════\n');
  }
}

export default CrossBrowserReporter;