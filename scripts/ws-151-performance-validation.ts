#!/usr/bin/env tsx

/**
 * WS-151 Performance Validation Script
 * Validates that monitoring overhead stays under 2% requirement
 * Run: npm run validate:performance
 */

import { performanceAuditor } from '../src/lib/monitoring/performance-audit';
import { performanceValidator } from '../src/lib/monitoring/performance-validator';
import { monitoringIntegrator } from '../src/lib/monitoring/integrator';

interface ValidationResults {
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  performanceAudit: any;
  thresholdValidation: any;
  monitoringHealth: any;
  timestamp: string;
  executionTime: number;
}

async function validatePerformance(): Promise<ValidationResults> {
  const startTime = Date.now();
  
  console.log('🔍 Starting WS-151 Performance Validation');
  console.log('=========================================\n');

  try {
    // Step 1: Initialize all monitoring services
    console.log('📋 Step 1: Initializing monitoring services...');
    const initResult = await monitoringIntegrator.initializeAllMonitoringServices();
    console.log(`✅ Services initialized: ${initResult.status}\n`);

    // Step 2: Run comprehensive performance audit
    console.log('📋 Step 2: Running comprehensive performance audit...');
    const auditResult = await performanceAuditor.runPerformanceAudit();
    console.log(`✅ Performance audit completed: ${auditResult.overallStatus}\n`);

    // Step 3: Quick threshold validation
    console.log('📋 Step 3: Validating performance threshold...');
    const thresholdResult = await performanceAuditor.validatePerformanceThreshold();
    console.log(`✅ Threshold validation: ${thresholdResult.passes ? 'PASS' : 'FAIL'}\n`);

    // Step 4: Get monitoring health status
    console.log('📋 Step 4: Checking monitoring health status...');
    const healthResult = await monitoringIntegrator.getMonitoringHealthStatus();
    console.log(`✅ Health status: ${healthResult.status}\n`);

    // Determine overall validation status
    const overallStatus = determineOverallStatus(auditResult, thresholdResult, healthResult);
    const executionTime = Date.now() - startTime;

    const results: ValidationResults = {
      overallStatus,
      performanceAudit: auditResult,
      thresholdValidation: thresholdResult,
      monitoringHealth: healthResult,
      timestamp: new Date().toISOString(),
      executionTime
    };

    // Print summary
    printValidationSummary(results);

    return results;

  } catch (error) {
    console.error('❌ Performance validation failed:', error);
    
    return {
      overallStatus: 'FAIL',
      performanceAudit: null,
      thresholdValidation: { passes: false, overhead: 999, message: 'Validation failed' },
      monitoringHealth: null,
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime
    };
  }
}

function determineOverallStatus(audit: any, threshold: any, health: any): 'PASS' | 'FAIL' | 'WARNING' {
  // Critical failure conditions
  if (!threshold.passes || audit.overallStatus === 'FAIL' || health.status === 'unhealthy') {
    return 'FAIL';
  }

  // Warning conditions
  if (audit.overallStatus === 'WARNING' || health.status === 'degraded' || audit.totalOverhead > 1.5) {
    return 'WARNING';
  }

  // All good
  return 'PASS';
}

function printValidationSummary(results: ValidationResults) {
  console.log('📊 WS-151 PERFORMANCE VALIDATION SUMMARY');
  console.log('=======================================');
  
  const statusIcon = results.overallStatus === 'PASS' ? '✅' : 
                    results.overallStatus === 'WARNING' ? '⚠️' : '❌';
  
  console.log(`Overall Status: ${statusIcon} ${results.overallStatus}`);
  console.log(`Execution Time: ${results.executionTime}ms`);
  console.log(`Timestamp: ${results.timestamp}\n`);

  if (results.performanceAudit) {
    console.log('Performance Metrics:');
    console.log(`  Total Overhead: ${results.performanceAudit.totalOverhead.toFixed(2)}% ${results.performanceAudit.thresholdMet ? '(✅ < 2%)' : '(❌ > 2%)'}`);
    console.log(`  Bundle Impact: ${results.performanceAudit.bundleImpact.percentage.toFixed(2)}%`);
    console.log(`  Web Vitals: ${results.performanceAudit.webVitalsImpact.LCP.withinThreshold ? '✅' : '❌'} Within thresholds`);
  }

  if (results.monitoringHealth) {
    console.log('\nMonitoring Health:');
    console.log(`  System Status: ${results.monitoringHealth.status}`);
    console.log(`  Performance Overhead: ${results.monitoringHealth.performance.overheadPercentage.toFixed(2)}%`);
    console.log(`  Wedding Day Optimized: ${results.monitoringHealth.performance.weddingDayOptimized ? '✅' : '⭕'}`);
  }

  if (results.performanceAudit?.recommendations?.length > 0) {
    console.log('\n💡 Recommendations:');
    results.performanceAudit.recommendations.forEach((rec: string, i: number) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }

  console.log('\n=======================================');
  
  // Exit with appropriate code
  if (results.overallStatus === 'FAIL') {
    console.log('❌ VALIDATION FAILED - Performance requirements not met');
    process.exit(1);
  } else if (results.overallStatus === 'WARNING') {
    console.log('⚠️ VALIDATION WARNING - Monitor performance closely');
    process.exit(0);
  } else {
    console.log('✅ VALIDATION PASSED - All performance requirements met');
    process.exit(0);
  }
}

// Run validation if script is called directly
if (require.main === module) {
  validatePerformance().catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
}

export { validatePerformance, ValidationResults };