#!/usr/bin/env tsx

import { BenchmarkRunner, type BenchmarkConfig } from '../__tests__/performance/budget-export/benchmark-runner';
import * as path from 'path';
import * as fs from 'fs/promises';

const CONFIG: BenchmarkConfig = {
  testUrl: 'http://localhost:3000/wedme/budget/export',
  devices: ['iPhone 12', 'Samsung Galaxy S21', 'Budget Android'],
  iterations: 3,
  outputPath: path.join(process.cwd(), 'performance-test-results'),
  thresholds: {
    renderTime: 300, // ms
    exportTime: 2000, // ms
    memoryUsage: 50, // MB
    fcp: 800, // ms
    lcp: 2500, // ms
    cls: 0.1 // Cumulative Layout Shift
  }
};

interface PerformanceAlert {
  type: 'warning' | 'error';
  message: string;
  metric: string;
  threshold: number;
  actual: number;
  device?: string;
}

class PerformanceTestRunner {
  private alerts: PerformanceAlert[] = [];
  
  async run(): Promise<void> {
    console.log('🔥 WS-166 Budget Export Performance Testing Suite\n');
    console.log('================================================\n');
    
    // Ensure output directory exists
    await this.ensureOutputDirectory();
    
    // Check if test server is running
    await this.checkTestServer();
    
    // Initialize and run benchmarks
    const runner = new BenchmarkRunner(CONFIG);
    
    try {
      await runner.initialize();
      console.log('✅ Browser initialized successfully\n');
      
      const results = await runner.runBenchmarks();
      
      // Analyze results and generate alerts
      this.analyzeResults(results);
      
      // Generate summary report
      await this.generateSummaryReport(results);
      
      // Display final results
      this.displayFinalResults(results);
      
    } catch (error) {
      console.error('❌ Performance testing failed:', error);
      process.exit(1);
    } finally {
      await runner.cleanup();
    }
  }
  
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(CONFIG.outputPath, { recursive: true });
      console.log('📁 Output directory ready');
    } catch (error) {
      console.error('Failed to create output directory:', error);
      throw error;
    }
  }
  
  private async checkTestServer(): Promise<void> {
    console.log('🔍 Checking test server availability...');
    
    try {
      const response = await fetch(CONFIG.testUrl);
      if (response.ok) {
        console.log('✅ Test server is running\n');
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Test server is not available');
      console.error('Please start the development server with: npm run dev');
      console.error('Then run this test again.\n');
      throw error;
    }
  }
  
  private analyzeResults(results: any[]): void {
    console.log('\n🔍 Analyzing Performance Results...\n');
    
    for (const result of results) {
      this.checkMetricThresholds(result);
    }
    
    // Check for performance regressions across devices
    this.checkPerformanceConsistency(results);
    
    // Generate device-specific recommendations
    this.generateDeviceRecommendations(results);
  }
  
  private checkMetricThresholds(result: any): void {
    const { metrics, deviceType } = result;
    const { thresholds } = CONFIG;
    
    // Check render time
    if (metrics.renderTime > thresholds.renderTime) {
      this.alerts.push({
        type: 'error',
        message: `Export dialog render time exceeds threshold`,
        metric: 'renderTime',
        threshold: thresholds.renderTime,
        actual: metrics.renderTime,
        device: deviceType
      });
    }
    
    // Check export time
    if (metrics.exportTime > thresholds.exportTime) {
      this.alerts.push({
        type: 'error',
        message: `Export generation time exceeds threshold`,
        metric: 'exportTime',
        threshold: thresholds.exportTime,
        actual: metrics.exportTime,
        device: deviceType
      });
    }
    
    // Check memory usage
    if (metrics.memoryUsage > thresholds.memoryUsage) {
      this.alerts.push({
        type: 'warning',
        message: `Memory usage is high`,
        metric: 'memoryUsage',
        threshold: thresholds.memoryUsage,
        actual: metrics.memoryUsage,
        device: deviceType
      });
    }
    
    // Check Core Web Vitals
    if (metrics.coreWebVitals.fcp > thresholds.fcp) {
      this.alerts.push({
        type: 'warning',
        message: `First Contentful Paint is slow`,
        metric: 'fcp',
        threshold: thresholds.fcp,
        actual: metrics.coreWebVitals.fcp,
        device: deviceType
      });
    }
    
    if (metrics.coreWebVitals.lcp > thresholds.lcp) {
      this.alerts.push({
        type: 'error',
        message: `Largest Contentful Paint exceeds threshold`,
        metric: 'lcp',
        threshold: thresholds.lcp,
        actual: metrics.coreWebVitals.lcp,
        device: deviceType
      });
    }
    
    if (metrics.coreWebVitals.cls > thresholds.cls) {
      this.alerts.push({
        type: 'warning',
        message: `Cumulative Layout Shift is too high`,
        metric: 'cls',
        threshold: thresholds.cls,
        actual: metrics.coreWebVitals.cls,
        device: deviceType
      });
    }
  }
  
  private checkPerformanceConsistency(results: any[]): void {
    const deviceGroups = results.reduce((acc, result) => {
      if (!acc[result.deviceType]) {
        acc[result.deviceType] = [];
      }
      acc[result.deviceType].push(result);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Check for significant performance differences between devices
    const devices = Object.keys(deviceGroups);
    if (devices.length > 1) {
      const avgRenderTimes = devices.map(device => {
        const deviceResults = deviceGroups[device];
        const avg = deviceResults.reduce((sum, r) => sum + r.metrics.renderTime, 0) / deviceResults.length;
        return { device, avgRenderTime: avg };
      });
      
      const maxRenderTime = Math.max(...avgRenderTimes.map(d => d.avgRenderTime));
      const minRenderTime = Math.min(...avgRenderTimes.map(d => d.avgRenderTime));
      
      if ((maxRenderTime - minRenderTime) > 200) { // 200ms difference
        this.alerts.push({
          type: 'warning',
          message: `Significant performance difference between devices`,
          metric: 'renderTime',
          threshold: 200,
          actual: maxRenderTime - minRenderTime
        });
      }
    }
  }
  
  private generateDeviceRecommendations(results: any[]): void {
    const devicePerformance = results.reduce((acc, result) => {
      if (!acc[result.deviceType]) {
        acc[result.deviceType] = {
          renderTimes: [],
          exportTimes: [],
          memoryUsage: [],
          passRate: 0,
          totalTests: 0
        };
      }
      
      acc[result.deviceType].renderTimes.push(result.metrics.renderTime);
      acc[result.deviceType].exportTimes.push(result.metrics.exportTime);
      acc[result.deviceType].memoryUsage.push(result.metrics.memoryUsage);
      acc[result.deviceType].totalTests++;
      
      if (result.passed) {
        acc[result.deviceType].passRate++;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    for (const [device, stats] of Object.entries(devicePerformance)) {
      const passRate = (stats.passRate / stats.totalTests) * 100;
      const avgRenderTime = stats.renderTimes.reduce((a: number, b: number) => a + b, 0) / stats.renderTimes.length;
      const avgMemory = stats.memoryUsage.reduce((a: number, b: number) => a + b, 0) / stats.memoryUsage.length;
      
      console.log(`📱 ${device} Performance Summary:`);
      console.log(`   Pass Rate: ${passRate.toFixed(1)}%`);
      console.log(`   Avg Render: ${avgRenderTime.toFixed(2)}ms`);
      console.log(`   Avg Memory: ${avgMemory.toFixed(2)}MB`);
      
      // Generate specific recommendations
      if (passRate < 100) {
        console.log(`   🔧 Recommendation: Optimize for ${device} performance`);
        
        if (avgRenderTime > CONFIG.thresholds.renderTime) {
          console.log(`      - Reduce initial render complexity`);
          console.log(`      - Consider lazy loading heavy components`);
        }
        
        if (avgMemory > CONFIG.thresholds.memoryUsage * 0.8) {
          console.log(`      - Optimize memory usage for large datasets`);
          console.log(`      - Implement more aggressive garbage collection`);
        }
      } else {
        console.log(`   ✅ Performance is optimal for ${device}`);
      }
      
      console.log('');
    }
  }
  
  private async generateSummaryReport(results: any[]): Promise<void> {
    const timestamp = new Date().toISOString();
    const reportData = {
      testSuite: 'WS-166 Budget Export Performance',
      timestamp,
      configuration: CONFIG,
      results,
      alerts: this.alerts,
      summary: {
        totalTests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        passRate: (results.filter(r => r.passed).length / results.length) * 100,
        criticalAlerts: this.alerts.filter(a => a.type === 'error').length,
        warnings: this.alerts.filter(a => a.type === 'warning').length
      },
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps()
    };
    
    const reportPath = path.join(CONFIG.outputPath, `ws-166-performance-summary-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(`📊 Detailed report saved to: ${reportPath}\n`);
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const criticalAlerts = this.alerts.filter(a => a.type === 'error');
    if (criticalAlerts.length > 0) {
      recommendations.push('Address critical performance issues before production deployment');
      recommendations.push('Implement performance monitoring in production environment');
    }
    
    const memoryAlerts = this.alerts.filter(a => a.metric === 'memoryUsage');
    if (memoryAlerts.length > 0) {
      recommendations.push('Optimize memory usage with virtualization for large datasets');
      recommendations.push('Implement progressive loading strategies');
    }
    
    const renderAlerts = this.alerts.filter(a => a.metric === 'renderTime');
    if (renderAlerts.length > 0) {
      recommendations.push('Optimize initial render path with React.memo and useMemo');
      recommendations.push('Consider code splitting for non-critical export features');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance targets are being met across all devices');
      recommendations.push('Continue monitoring in production environment');
    }
    
    return recommendations;
  }
  
  private generateNextSteps(): string[] {
    return [
      'Deploy performance monitoring to production',
      'Set up automated performance regression testing',
      'Implement real-user monitoring (RUM) for export features',
      'Create performance budgets for CI/CD pipeline',
      'Schedule regular performance audits for WS-166 features'
    ];
  }
  
  private displayFinalResults(results: any[]): void {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = (passed / total) * 100;
    
    console.log('\n🏁 FINAL PERFORMANCE TEST RESULTS');
    console.log('==================================\n');
    
    console.log(`📊 Overall Results:`);
    console.log(`   Tests Run: ${total}`);
    console.log(`   Tests Passed: ${passed}`);
    console.log(`   Pass Rate: ${passRate.toFixed(1)}%\n`);
    
    if (this.alerts.length > 0) {
      console.log('⚠️  Performance Alerts:');
      for (const alert of this.alerts) {
        const icon = alert.type === 'error' ? '❌' : '⚠️';
        const device = alert.device ? ` (${alert.device})` : '';
        console.log(`   ${icon} ${alert.message}${device}`);
        console.log(`      ${alert.metric}: ${alert.actual} (threshold: ${alert.threshold})`);
      }
      console.log('');
    }
    
    if (passRate === 100) {
      console.log('🎉 ALL PERFORMANCE TESTS PASSED!');
      console.log('✅ WS-166 is ready for production deployment\n');
    } else {
      console.log('🔧 Performance issues detected');
      console.log('❌ Address issues before production deployment\n');
    }
    
    console.log('Next Steps:');
    console.log('- Review detailed performance report');
    console.log('- Implement recommended optimizations');
    console.log('- Re-run tests after optimizations');
    console.log('- Deploy with performance monitoring enabled\n');
  }
}

// Run the performance tests if this script is executed directly
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.run().catch((error) => {
    console.error('Performance testing failed:', error);
    process.exit(1);
  });
}

export { PerformanceTestRunner };