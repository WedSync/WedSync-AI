/**
 * WS-151 Performance Audit
 * Validates that monitoring overhead stays under the 2% requirement
 */

import { performanceValidator } from './performance-validator';
import { bundleAnalyzer } from './bundle-analyzer';
import { monitoringIntegrator } from './integrator';

interface PerformanceAuditResult {
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  totalOverhead: number;
  thresholdMet: boolean;
  componentBreakdown: {
    sentry: number;
    logRocket: number;
    webVitals: number;
    bundleAnalyzer: number;
    total: number;
  };
  bundleImpact: {
    totalSize: number;
    monitoringSize: number;
    percentage: number;
  };
  webVitalsImpact: {
    LCP: { degradation: number; withinThreshold: boolean };
    FID: { degradation: number; withinThreshold: boolean };
    CLS: { degradation: number; withinThreshold: boolean };
  };
  recommendations: string[];
  timestamp: string;
  auditId: string;
}

export class PerformanceAuditor {
  private static instance: PerformanceAuditor;

  private constructor() {}

  static getInstance(): PerformanceAuditor {
    if (!PerformanceAuditor.instance) {
      PerformanceAuditor.instance = new PerformanceAuditor();
    }
    return PerformanceAuditor.instance;
  }

  /**
   * Run comprehensive performance audit
   */
  async runPerformanceAudit(): Promise<PerformanceAuditResult> {
    const auditId = `perf_audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    console.log(`🔍 Starting WS-151 Performance Audit (ID: ${auditId})`);
    console.log('=====================================\n');

    try {
      // Initialize monitoring services
      console.log('📋 Initializing monitoring services...');
      const monitoringStatus =
        await monitoringIntegrator.initializeAllMonitoringServices();
      console.log(
        `✅ Monitoring services initialized: ${monitoringStatus.status}\n`,
      );

      // Measure performance overhead
      console.log('⚡ Measuring performance overhead...');
      const overhead = await performanceValidator.measureMonitoringOverhead();
      console.log(`📊 Total overhead: ${overhead.total.toFixed(2)}%`);
      console.log(`   - Sentry: ${overhead.sentry.toFixed(2)}%`);
      console.log(`   - LogRocket: ${overhead.logRocket.toFixed(2)}%`);
      console.log(`   - Web Vitals: ${overhead.webVitals.toFixed(2)}%`);
      console.log(
        `   - Bundle Analyzer: ${overhead.bundleAnalyzer.toFixed(2)}%\n`,
      );

      // Measure bundle impact
      console.log('📦 Analyzing bundle impact...');
      const bundleSize = await bundleAnalyzer.getMonitoringBundleSize();
      console.log(
        `📦 Bundle impact: ${bundleSize.total} bytes (${bundleSize.percentage.toFixed(2)}%)\n`,
      );

      // Measure Web Vitals impact
      console.log('🌐 Validating Web Vitals impact...');
      const webVitalsImpact =
        await performanceValidator.validateWebVitalsImpact();
      console.log(`🌐 LCP degradation: ${webVitalsImpact.LCP.degradation}ms`);
      console.log(`🌐 FID degradation: ${webVitalsImpact.FID.degradation}ms`);
      console.log(`🌐 CLS degradation: ${webVitalsImpact.CLS.degradation}\n`);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        overhead,
        bundleSize,
        webVitalsImpact,
      );

      // Determine overall status
      const thresholdMet = overhead.total < 2.0;
      const webVitalsOk =
        webVitalsImpact.LCP.status !== 'fail' &&
        webVitalsImpact.FID.status !== 'fail' &&
        webVitalsImpact.CLS.status !== 'fail';

      let overallStatus: 'PASS' | 'FAIL' | 'WARNING';
      if (thresholdMet && webVitalsOk && bundleSize.percentage < 5) {
        overallStatus = 'PASS';
      } else if (overhead.total < 3.0 && webVitalsOk) {
        overallStatus = 'WARNING';
      } else {
        overallStatus = 'FAIL';
      }

      const result: PerformanceAuditResult = {
        overallStatus,
        totalOverhead: overhead.total,
        thresholdMet,
        componentBreakdown: {
          sentry: overhead.sentry,
          logRocket: overhead.logRocket,
          webVitals: overhead.webVitals,
          bundleAnalyzer: overhead.bundleAnalyzer,
          total: overhead.total,
        },
        bundleImpact: {
          totalSize: bundleSize.total,
          monitoringSize: bundleSize.total,
          percentage: bundleSize.percentage,
        },
        webVitalsImpact: {
          LCP: {
            degradation: webVitalsImpact.LCP.degradation,
            withinThreshold: webVitalsImpact.LCP.status !== 'fail',
          },
          FID: {
            degradation: webVitalsImpact.FID.degradation,
            withinThreshold: webVitalsImpact.FID.status !== 'fail',
          },
          CLS: {
            degradation: webVitalsImpact.CLS.degradation,
            withinThreshold: webVitalsImpact.CLS.status !== 'fail',
          },
        },
        recommendations,
        timestamp: new Date().toISOString(),
        auditId,
      };

      // Log final result
      console.log('📋 PERFORMANCE AUDIT COMPLETE');
      console.log('============================');
      console.log(
        `Status: ${overallStatus === 'PASS' ? '✅ PASS' : overallStatus === 'WARNING' ? '⚠️ WARNING' : '❌ FAIL'}`,
      );
      console.log(
        `Total Overhead: ${overhead.total.toFixed(2)}% ${thresholdMet ? '(✅ Under 2%)' : '(❌ Over 2%)'}`,
      );
      console.log(`Bundle Impact: ${bundleSize.percentage.toFixed(2)}%`);
      console.log(
        `Web Vitals: ${webVitalsOk ? '✅ Within thresholds' : '❌ Exceeds thresholds'}`,
      );

      if (recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      console.log(`\n🔍 Audit ID: ${auditId}`);
      console.log(`📅 Timestamp: ${result.timestamp}\n`);

      return result;
    } catch (error) {
      // GUARDIAN FIX: Use environment-aware logging to prevent data exposure
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Performance audit failed:', error);
      }

      return {
        overallStatus: 'FAIL',
        totalOverhead: 999, // High number to indicate failure
        thresholdMet: false,
        componentBreakdown: {
          sentry: 0,
          logRocket: 0,
          webVitals: 0,
          bundleAnalyzer: 0,
          total: 999,
        },
        bundleImpact: {
          totalSize: 0,
          monitoringSize: 0,
          percentage: 0,
        },
        webVitalsImpact: {
          LCP: { degradation: 0, withinThreshold: false },
          FID: { degradation: 0, withinThreshold: false },
          CLS: { degradation: 0, withinThreshold: false },
        },
        recommendations: ['Fix audit execution errors before proceeding'],
        timestamp: new Date().toISOString(),
        auditId,
      };
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    overhead: any,
    bundleSize: any,
    webVitals: any,
  ): string[] {
    const recommendations: string[] = [];

    // Overhead recommendations
    if (overhead.total > 2.0) {
      recommendations.push(
        'CRITICAL: Monitoring overhead exceeds 2% - immediate optimization required',
      );

      if (overhead.logRocket > 0.5) {
        recommendations.push(
          'Reduce LogRocket sampling rate or implement lazy loading',
        );
      }

      if (overhead.sentry > 1.0) {
        recommendations.push(
          'Optimize Sentry configuration - reduce transport frequency',
        );
      }
    } else if (overhead.total > 1.5) {
      recommendations.push(
        'Monitor overhead is approaching threshold - consider optimizations',
      );
    } else {
      recommendations.push(
        '✅ Performance overhead is within acceptable limits',
      );
    }

    // Bundle recommendations
    if (bundleSize.percentage > 5) {
      recommendations.push(
        'Bundle size impact is high - consider code splitting',
      );
    } else if (bundleSize.percentage > 2) {
      recommendations.push('Bundle size is moderate - monitor for increases');
    }

    // Web Vitals recommendations
    if (webVitals.LCP.status === 'fail') {
      recommendations.push(
        'LCP degradation is too high - optimize largest contentful paint',
      );
    }

    if (webVitals.FID.status === 'fail') {
      recommendations.push(
        'FID degradation is too high - reduce JavaScript execution time',
      );
    }

    if (webVitals.CLS.status === 'fail') {
      recommendations.push(
        'CLS degradation is too high - optimize layout stability',
      );
    }

    // Wedding day recommendations
    const isWeddingDay = process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true';
    if (isWeddingDay) {
      recommendations.push(
        'Wedding day mode active - monitoring is already optimized',
      );
    } else {
      recommendations.push(
        'Consider enabling wedding day mode for ultra-low overhead',
      );
    }

    return recommendations;
  }

  /**
   * Run quick performance validation
   */
  async validatePerformanceThreshold(): Promise<{
    passes: boolean;
    overhead: number;
    message: string;
  }> {
    try {
      const overhead = await performanceValidator.measureMonitoringOverhead();
      const passes = overhead.total < 2.0;

      return {
        passes,
        overhead: overhead.total,
        message: passes
          ? `✅ Performance validation PASSED: ${overhead.total.toFixed(2)}% overhead (< 2%)`
          : `❌ Performance validation FAILED: ${overhead.total.toFixed(2)}% overhead (> 2%)`,
      };
    } catch (error) {
      return {
        passes: false,
        overhead: 999,
        message: `❌ Performance validation ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Export audit results for reporting
   */
  async exportAuditResults(
    result: PerformanceAuditResult,
    format: 'json' | 'csv' | 'html' = 'json',
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);

      case 'csv':
        return this.formatResultsAsCsv(result);

      case 'html':
        return this.formatResultsAsHtml(result);

      default:
        return JSON.stringify(result, null, 2);
    }
  }

  private formatResultsAsCsv(result: PerformanceAuditResult): string {
    return [
      'Metric,Value,Status',
      `Total Overhead,${result.totalOverhead.toFixed(2)}%,${result.thresholdMet ? 'PASS' : 'FAIL'}`,
      `Sentry Overhead,${result.componentBreakdown.sentry.toFixed(2)}%,INFO`,
      `LogRocket Overhead,${result.componentBreakdown.logRocket.toFixed(2)}%,INFO`,
      `Bundle Impact,${result.bundleImpact.percentage.toFixed(2)}%,INFO`,
      `LCP Degradation,${result.webVitalsImpact.LCP.degradation}ms,${result.webVitalsImpact.LCP.withinThreshold ? 'PASS' : 'FAIL'}`,
      `FID Degradation,${result.webVitalsImpact.FID.degradation}ms,${result.webVitalsImpact.FID.withinThreshold ? 'PASS' : 'FAIL'}`,
      `CLS Degradation,${result.webVitalsImpact.CLS.degradation},${result.webVitalsImpact.CLS.withinThreshold ? 'PASS' : 'FAIL'}`,
    ].join('\n');
  }

  private formatResultsAsHtml(result: PerformanceAuditResult): string {
    const statusColor =
      result.overallStatus === 'PASS'
        ? 'green'
        : result.overallStatus === 'WARNING'
          ? 'orange'
          : 'red';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>WS-151 Performance Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .metric { margin: 10px 0; }
        .pass { color: green; }
        .fail { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>WS-151 Performance Audit Report</h1>
    <div class="status">${result.overallStatus}</div>
    <p><strong>Audit ID:</strong> ${result.auditId}</p>
    <p><strong>Timestamp:</strong> ${result.timestamp}</p>

    <h2>Performance Overview</h2>
    <div class="metric ${result.thresholdMet ? 'pass' : 'fail'}">
        <strong>Total Overhead:</strong> ${result.totalOverhead.toFixed(2)}%
        ${result.thresholdMet ? '✅ Under 2%' : '❌ Over 2%'}
    </div>

    <h2>Component Breakdown</h2>
    <table>
        <tr><th>Component</th><th>Overhead</th></tr>
        <tr><td>Sentry</td><td>${result.componentBreakdown.sentry.toFixed(2)}%</td></tr>
        <tr><td>LogRocket</td><td>${result.componentBreakdown.logRocket.toFixed(2)}%</td></tr>
        <tr><td>Web Vitals</td><td>${result.componentBreakdown.webVitals.toFixed(2)}%</td></tr>
        <tr><td>Bundle Analyzer</td><td>${result.componentBreakdown.bundleAnalyzer.toFixed(2)}%</td></tr>
    </table>

    <h2>Recommendations</h2>
    <ul>
        ${result.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
    </ul>
</body>
</html>`;
  }
}

// Export singleton and convenience functions
export const performanceAuditor = PerformanceAuditor.getInstance();

export const runPerformanceAudit = () => {
  return performanceAuditor.runPerformanceAudit();
};

export const validatePerformanceThreshold = () => {
  return performanceAuditor.validatePerformanceThreshold();
};
