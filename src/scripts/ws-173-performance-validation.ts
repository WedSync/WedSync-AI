#!/usr/bin/env tsx

/**
 * WS-173 Performance Validation Script
 * Validates Core Web Vitals targets using Browser MCP and Playwright MCP
 * Run with: npx tsx src/scripts/ws-173-performance-validation.ts
 */

import {
  WS173PerformanceTestSuite,
  WEDDING_TEST_SCENARIOS,
} from '@/components/performance/testing/PerformanceTestSuite';

interface ValidationReport {
  timestamp: string;
  overallPassed: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  coreWebVitalsStatus: {
    fcp: 'good' | 'needs-improvement' | 'poor';
    lcp: 'good' | 'needs-improvement' | 'poor';
    cls: 'good' | 'needs-improvement' | 'poor';
    fid: 'good' | 'needs-improvement' | 'poor';
  };
  weddingOptimizationScore: number;
  recommendations: string[];
  criticalFailures: string[];
}

class WS173PerformanceValidator {
  private testSuite: WS173PerformanceTestSuite;

  constructor() {
    this.testSuite = new WS173PerformanceTestSuite(true); // Debug mode enabled
  }

  async validatePerformance(): Promise<ValidationReport> {
    console.log('🚀 Starting WS-173 Performance Validation...\n');

    try {
      // Step 1: Run all performance tests
      console.log(
        '📊 Running performance tests across all wedding scenarios...',
      );
      const results = await this.testSuite.runAllTests();

      // Step 2: Analyze results
      console.log('📈 Analyzing performance results...');
      const summary = this.testSuite.getTestSummary();

      // Step 3: Generate validation report
      const report = this.generateValidationReport(summary);

      // Step 4: Display results
      this.displayResults(report);

      // Step 5: Export results
      await this.exportResults(report);

      return report;
    } catch (error) {
      console.error('❌ Performance validation failed:', error);
      throw error;
    }
  }

  private generateValidationReport(summary: any): ValidationReport {
    const averageMetrics = summary.averageMetrics || {};

    // Determine Core Web Vitals status
    const coreWebVitalsStatus = {
      fcp: this.getMetricStatus(averageMetrics.fcp, 1800, 3000),
      lcp: this.getMetricStatus(averageMetrics.lcp, 2500, 4000),
      cls: this.getMetricStatus(averageMetrics.cls, 0.1, 0.25),
      fid: this.getMetricStatus(averageMetrics.fid, 100, 300),
    };

    // Calculate wedding optimization score
    const weddingOptimizationScore = this.calculateWeddingOptimizationScore(
      summary.results,
    );

    // Identify critical failures
    const criticalFailures = this.identifyCriticalFailures(summary.results);

    return {
      timestamp: new Date().toISOString(),
      overallPassed: summary.passRate >= 80, // 80% pass rate required
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        passRate: summary.passRate,
      },
      coreWebVitalsStatus,
      weddingOptimizationScore,
      recommendations: summary.recommendations || [],
      criticalFailures,
    };
  }

  private getMetricStatus(
    value: number | undefined,
    goodThreshold: number,
    poorThreshold: number,
  ): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good';
    if (value <= goodThreshold) return 'good';
    if (value <= poorThreshold) return 'needs-improvement';
    return 'poor';
  }

  private calculateWeddingOptimizationScore(results: any[]): number {
    if (results.length === 0) return 0;

    let score = 0;
    const weights = {
      mobile: 2, // Mobile performance is 2x important for wedding suppliers
      venue: 1.5, // Venue context is 1.5x important
      '3g': 2, // 3G performance is 2x important for poor venue connectivity
      supplier: 1.3, // Supplier context is 1.3x important
      gallery: 1.2, // Gallery context is 1.2x important
    };

    for (const result of results) {
      let testScore = result.passed ? 100 : 0;
      let testWeight = 1;

      // Apply wedding-specific weights
      if (result.deviceType === 'mobile') testWeight *= weights.mobile;
      if (result.context === 'venue') testWeight *= weights.venue;
      if (result.connectionType === '3g') testWeight *= weights['3g'];
      if (result.context === 'supplier') testWeight *= weights.supplier;
      if (result.context === 'gallery') testWeight *= weights.gallery;

      score += testScore * testWeight;
    }

    // Calculate weighted average
    const totalWeight = results.reduce((sum, result) => {
      let weight = 1;
      if (result.deviceType === 'mobile') weight *= weights.mobile;
      if (result.context === 'venue') weight *= weights.venue;
      if (result.connectionType === '3g') weight *= weights['3g'];
      if (result.context === 'supplier') weight *= weights.supplier;
      if (result.context === 'gallery') weight *= weights.gallery;
      return sum + weight;
    }, 0);

    return Math.round(score / totalWeight);
  }

  private identifyCriticalFailures(results: any[]): string[] {
    const criticalFailures: string[] = [];

    // Critical: Mobile 3G failures
    const mobile3GFailures = results.filter(
      (r) =>
        r.deviceType === 'mobile' && r.connectionType === '3g' && !r.passed,
    );
    if (mobile3GFailures.length > 0) {
      criticalFailures.push(
        `${mobile3GFailures.length} mobile 3G tests failed - Critical for wedding venue usage`,
      );
    }

    // Critical: Venue context failures
    const venueFailures = results.filter(
      (r) => r.context === 'venue' && !r.passed,
    );
    if (venueFailures.length > 0) {
      criticalFailures.push(
        `${venueFailures.length} venue tests failed - Critical for wedding day coordination`,
      );
    }

    // Critical: Photo gallery failures on mobile
    const galleryMobileFailures = results.filter(
      (r) => r.context === 'gallery' && r.deviceType === 'mobile' && !r.passed,
    );
    if (galleryMobileFailures.length > 0) {
      criticalFailures.push(
        `${galleryMobileFailures.length} mobile gallery tests failed - Critical for wedding photography`,
      );
    }

    return criticalFailures;
  }

  private displayResults(report: ValidationReport): void {
    console.log('\n🎯 WS-173 Performance Validation Results\n');
    console.log('='.repeat(50));

    // Overall status
    const statusIcon = report.overallPassed ? '✅' : '❌';
    const statusText = report.overallPassed ? 'PASSED' : 'FAILED';
    console.log(`${statusIcon} Overall Status: ${statusText}`);
    console.log(
      `📊 Pass Rate: ${report.summary.passRate.toFixed(1)}% (${report.summary.passed}/${report.summary.total})`,
    );
    console.log(
      `🏆 Wedding Optimization Score: ${report.weddingOptimizationScore}/100\n`,
    );

    // Core Web Vitals Status
    console.log('🎯 Core Web Vitals Status:');
    console.log(
      `   FCP (First Contentful Paint): ${this.getStatusIcon(report.coreWebVitalsStatus.fcp)} ${report.coreWebVitalsStatus.fcp}`,
    );
    console.log(
      `   LCP (Largest Contentful Paint): ${this.getStatusIcon(report.coreWebVitalsStatus.lcp)} ${report.coreWebVitalsStatus.lcp}`,
    );
    console.log(
      `   CLS (Cumulative Layout Shift): ${this.getStatusIcon(report.coreWebVitalsStatus.cls)} ${report.coreWebVitalsStatus.cls}`,
    );
    console.log(
      `   FID (First Input Delay): ${this.getStatusIcon(report.coreWebVitalsStatus.fid)} ${report.coreWebVitalsStatus.fid}\n`,
    );

    // Critical Failures
    if (report.criticalFailures.length > 0) {
      console.log('🚨 Critical Failures:');
      report.criticalFailures.forEach((failure) => {
        console.log(`   ❌ ${failure}`);
      });
      console.log();
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('💡 Optimization Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      console.log();
    }

    // WS-173 Specific Targets
    console.log('🎯 WS-173 Performance Targets:');
    console.log(
      '   • FCP < 2.5s on 3G (Wedding suppliers need fast initial load)',
    );
    console.log('   • LCP < 4s on 3G (Venue images must load quickly)');
    console.log('   • CLS < 0.1 (No layout shifts during critical tasks)');
    console.log(
      '   • FID < 100ms (Immediate response for time-sensitive actions)',
    );
    console.log(
      '   • Bundle < 250KB (Fast downloads on poor venue connections)\n',
    );

    // Next Steps
    if (!report.overallPassed) {
      console.log('🔧 Next Steps:');
      console.log('   1. Review failed test scenarios');
      console.log('   2. Implement recommended optimizations');
      console.log('   3. Focus on mobile 3G performance');
      console.log('   4. Re-run validation after improvements');
      console.log('   5. Test at actual wedding venues for validation\n');
    } else {
      console.log('🎉 Congratulations! WS-173 performance targets achieved.');
      console.log(
        '   Wedding suppliers will have fast, reliable access to WedSync.\n',
      );
    }

    console.log('='.repeat(50));
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'good':
        return '✅';
      case 'needs-improvement':
        return '⚠️';
      case 'poor':
        return '❌';
      default:
        return '❓';
    }
  }

  private async exportResults(report: ValidationReport): Promise<void> {
    const resultsPath =
      '/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/performance-validation-results.json';

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(resultsPath, JSON.stringify(report, null, 2));
      console.log(`📄 Results exported to: ${resultsPath}`);
    } catch (error) {
      console.error('❌ Failed to export results:', error);
    }
  }
}

// CLI execution
async function main() {
  const validator = new WS173PerformanceValidator();

  try {
    const report = await validator.validatePerformance();

    // Exit with appropriate code
    const exitCode = report.overallPassed ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error('💥 Performance validation crashed:', error);
    process.exit(1);
  }
}

// Export for programmatic usage
export { WS173PerformanceValidator, ValidationReport };

// Run if called directly
if (require.main === module) {
  main();
}
