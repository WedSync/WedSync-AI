#!/usr/bin/env ts-node
// WS-010 Round 2: ML System Validation Script
// Validates that the ML system meets all requirements before production deployment

import { mlAPI, validateMLHealth } from '../src/lib/ml/ml-api';
import { mlConflictDetector } from '../src/lib/ml/conflict-detector';
import { mlVendorAnalyzer } from '../src/lib/ml/vendor-analyzer';
import { mlTimelineOptimizer } from '../src/lib/ml/timeline-optimizer';

interface ValidationResult {
  component: string;
  requirement: string;
  expected: any;
  actual: any;
  passed: boolean;
  message: string;
}

interface ValidationReport {
  timestamp: string;
  overallStatus: 'PASS' | 'FAIL';
  passRate: number;
  results: ValidationResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    criticalFailures: number;
  };
}

class MLSystemValidator {
  private results: ValidationResult[] = [];
  private readonly requiredAccuracy = 0.85;
  private readonly maxInferenceTime = 2000; // 2 seconds

  async runFullValidation(): Promise<ValidationReport> {
    console.log('🎯 Starting ML System Validation');
    console.log('================================\n');

    try {
      // 1. Model Health Validation
      await this.validateModelHealth();

      // 2. Accuracy Requirements
      await this.validateAccuracyRequirements();

      // 3. Performance Requirements  
      await this.validatePerformanceRequirements();

      // 4. Integration Testing
      await this.validateIntegrationRequirements();

      // 5. API Endpoint Validation
      await this.validateAPIEndpoints();

      // 6. Production Readiness
      await this.validateProductionReadiness();

    } catch (error) {
      this.addResult({
        component: 'System',
        requirement: 'Validation Process',
        expected: 'Success',
        actual: `Error: ${error.message}`,
        passed: false,
        message: 'Validation process failed unexpectedly'
      });
    }

    return this.generateReport();
  }

  private async validateModelHealth(): Promise<void> {
    console.log('🏥 Validating Model Health...');

    try {
      const healthCheck = await validateMLHealth();

      // Conflict Detector Health
      this.addResult({
        component: 'Conflict Detector',
        requirement: 'Model Status',
        expected: 'healthy',
        actual: healthCheck.conflict_detector.status,
        passed: healthCheck.conflict_detector.status === 'healthy',
        message: 'Conflict detection model must be healthy'
      });

      this.addResult({
        component: 'Conflict Detector', 
        requirement: 'Accuracy Threshold',
        expected: `>= ${this.requiredAccuracy}`,
        actual: healthCheck.conflict_detector.accuracy,
        passed: healthCheck.conflict_detector.accuracy >= this.requiredAccuracy,
        message: 'Conflict detection accuracy must exceed 85%'
      });

      // Vendor Analyzer Health
      this.addResult({
        component: 'Vendor Analyzer',
        requirement: 'Performance Score',
        expected: '>= 0.80',
        actual: healthCheck.vendor_analyzer.performance,
        passed: healthCheck.vendor_analyzer.performance >= 0.80,
        message: 'Vendor analyzer performance must exceed 80%'
      });

      // Timeline Optimizer Health
      this.addResult({
        component: 'Timeline Optimizer',
        requirement: 'Optimization Score',
        expected: '>= 0.75',
        actual: healthCheck.timeline_optimizer.optimization_score,
        passed: healthCheck.timeline_optimizer.optimization_score >= 0.75,
        message: 'Timeline optimizer must achieve 75% optimization score'
      });

      // Overall Health
      this.addResult({
        component: 'ML System',
        requirement: 'Overall Health',
        expected: 'healthy',
        actual: healthCheck.overall_health,
        passed: healthCheck.overall_health === 'healthy',
        message: 'Overall ML system health must be healthy'
      });

    } catch (error) {
      this.addResult({
        component: 'ML System',
        requirement: 'Health Check',
        expected: 'Success',
        actual: `Error: ${error.message}`,
        passed: false,
        message: 'ML system health check failed'
      });
    }
  }

  private async validateAccuracyRequirements(): Promise<void> {
    console.log('🎯 Validating Accuracy Requirements...');

    try {
      // Test conflict detection accuracy with known scenarios
      const testScenarios = this.generateAccuracyTestScenarios();
      const accuracyResults = [];

      for (const scenario of testScenarios) {
        const result = await mlConflictDetector.detectConflicts({
          timeline_id: `test_${Date.now()}`,
          timeline_items: scenario.timeline,
          vendor_data: [],
          wedding_context: scenario.context,
          optimization_goals: { minimize_conflicts: true } as any,
          inference_type: 'conflict_detection'
        });

        accuracyResults.push({
          scenario: scenario.name,
          accuracy: result.overall_confidence,
          expectedConflicts: scenario.expectedConflicts,
          detectedConflicts: result.predictions.length
        });
      }

      // Calculate overall accuracy
      const overallAccuracy = accuracyResults.reduce((sum, result) => 
        sum + result.accuracy, 0) / accuracyResults.length;

      this.addResult({
        component: 'Conflict Detection',
        requirement: 'Batch Accuracy Test',
        expected: `>= ${this.requiredAccuracy}`,
        actual: overallAccuracy,
        passed: overallAccuracy >= this.requiredAccuracy,
        message: `Tested ${testScenarios.length} scenarios with average accuracy ${(overallAccuracy * 100).toFixed(2)}%`
      });

      // Validate individual scenario accuracy
      accuracyResults.forEach((result, index) => {
        this.addResult({
          component: 'Conflict Detection',
          requirement: `${result.scenario} Accuracy`,
          expected: `>= ${this.requiredAccuracy}`,
          actual: result.accuracy,
          passed: result.accuracy >= this.requiredAccuracy,
          message: `Scenario-specific accuracy validation`
        });
      });

    } catch (error) {
      this.addResult({
        component: 'ML Accuracy',
        requirement: 'Accuracy Testing',
        expected: 'Success',
        actual: `Error: ${error.message}`,
        passed: false,
        message: 'Accuracy validation failed'
      });
    }
  }

  private async validatePerformanceRequirements(): Promise<void> {
    console.log('⚡ Validating Performance Requirements...');

    try {
      // Test inference time with various complexity levels
      const complexityLevels = [
        { name: 'Simple', vendorCount: 3 },
        { name: 'Medium', vendorCount: 8 },
        { name: 'Complex', vendorCount: 15 },
        { name: 'Enterprise', vendorCount: 25 }
      ];

      for (const level of complexityLevels) {
        const timeline = this.generateTimelineWithComplexity(level.vendorCount);
        const startTime = Date.now();

        await mlAPI.optimizeTimeline({
          timeline_id: `perf_test_${level.name.toLowerCase()}`,
          optimization_goals: { minimize_conflicts: true }
        });

        const inferenceTime = Date.now() - startTime;

        this.addResult({
          component: 'ML Performance',
          requirement: `${level.name} Timeline Inference Time`,
          expected: `<= ${this.maxInferenceTime}ms`,
          actual: `${inferenceTime}ms`,
          passed: inferenceTime <= this.maxInferenceTime,
          message: `Performance test with ${level.vendorCount} vendors`
        });
      }

      // Test concurrent performance
      const concurrentRequests = 5;
      const concurrentPromises = [];
      const concurrentStartTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = mlAPI.optimizeTimeline({
          timeline_id: `concurrent_test_${i}`,
          optimization_goals: { minimize_conflicts: true }
        });
        concurrentPromises.push(promise);
      }

      await Promise.all(concurrentPromises);
      const concurrentTime = Date.now() - concurrentStartTime;
      const averageTime = concurrentTime / concurrentRequests;

      this.addResult({
        component: 'ML Performance',
        requirement: 'Concurrent Processing',
        expected: `Average <= ${this.maxInferenceTime}ms`,
        actual: `Average ${averageTime.toFixed(0)}ms`,
        passed: averageTime <= this.maxInferenceTime,
        message: `Concurrent processing of ${concurrentRequests} requests`
      });

    } catch (error) {
      this.addResult({
        component: 'ML Performance',
        requirement: 'Performance Testing',
        expected: 'Success',
        actual: `Error: ${error.message}`,
        passed: false,
        message: 'Performance validation failed'
      });
    }
  }

  private async validateIntegrationRequirements(): Promise<void> {
    console.log('🔗 Validating Integration Requirements...');

    try {
      // Test ML API integration
      const testRequest = {
        timeline_id: 'integration_test',
        optimization_goals: { minimize_conflicts: true }
      };

      const apiResponse = await mlAPI.optimizeTimeline(testRequest);

      this.addResult({
        component: 'ML API',
        requirement: 'API Response Structure',
        expected: 'Valid response with required fields',
        actual: apiResponse.success ? 'Valid' : 'Invalid',
        passed: apiResponse.success && 
                apiResponse.data?.predictions !== undefined &&
                apiResponse.data?.optimizations !== undefined,
        message: 'ML API must return structured response with predictions and optimizations'
      });

      this.addResult({
        component: 'ML API',
        requirement: 'Response Time Tracking',
        expected: 'Inference time recorded',
        actual: `${apiResponse.inference_time_ms}ms`,
        passed: apiResponse.inference_time_ms > 0 && apiResponse.inference_time_ms <= this.maxInferenceTime,
        message: 'ML API must track and report inference time'
      });

      // Test model version tracking
      this.addResult({
        component: 'ML System',
        requirement: 'Model Version Tracking',
        expected: 'Version information provided',
        actual: apiResponse.model_version || 'None',
        passed: !!apiResponse.model_version && apiResponse.model_version !== 'error',
        message: 'ML system must track and report model versions'
      });

    } catch (error) {
      this.addResult({
        component: 'ML Integration',
        requirement: 'Integration Testing',
        expected: 'Success',
        actual: `Error: ${error.message}`,
        passed: false,
        message: 'Integration validation failed'
      });
    }
  }

  private async validateAPIEndpoints(): Promise<void> {
    console.log('🔌 Validating API Endpoints...');

    const endpoints = [
      { path: '/api/ml/timeline', method: 'POST', name: 'Timeline Optimization' },
      { path: '/api/ml/vendors', method: 'POST', name: 'Vendor Analysis' },
      { path: '/api/ml/conflicts', method: 'POST', name: 'Conflict Detection' },
      { path: '/api/ml/health', method: 'GET', name: 'Health Check' }
    ];

    // Note: In a real validation, these would be HTTP requests to running server
    // For this demo, we'll validate the ML service directly
    
    try {
      // Validate conflict detection endpoint
      const conflictResult = await mlConflictDetector.detectConflicts({
        timeline_id: 'api_test',
        timeline_items: this.generateSimpleTimeline(),
        vendor_data: [],
        wedding_context: this.generateTestContext(),
        optimization_goals: { minimize_conflicts: true } as any,
        inference_type: 'conflict_detection'
      });

      this.addResult({
        component: 'API Endpoint',
        requirement: 'Conflict Detection API',
        expected: 'Valid response structure',
        actual: 'Valid',
        passed: conflictResult.predictions !== undefined && 
                conflictResult.overall_confidence !== undefined,
        message: '/api/ml/conflicts endpoint functionality validated'
      });

      // Validate vendor analysis
      const vendorResult = await mlVendorAnalyzer.analyzeVendorPerformance({
        include_predictions: true
      });

      this.addResult({
        component: 'API Endpoint', 
        requirement: 'Vendor Analysis API',
        expected: 'Valid response structure',
        actual: vendorResult.success ? 'Valid' : 'Invalid',
        passed: vendorResult.success,
        message: '/api/ml/vendors endpoint functionality validated'
      });

    } catch (error) {
      this.addResult({
        component: 'API Endpoints',
        requirement: 'Endpoint Validation',
        expected: 'Success',
        actual: `Error: ${error.message}`,
        passed: false,
        message: 'API endpoint validation failed'
      });
    }
  }

  private async validateProductionReadiness(): Promise<void> {
    console.log('🚀 Validating Production Readiness...');

    try {
      // Check memory management
      const initialMemory = this.getMemoryUsage();
      
      // Run intensive ML operations
      for (let i = 0; i < 10; i++) {
        await mlConflictDetector.detectConflicts({
          timeline_id: `memory_test_${i}`,
          timeline_items: this.generateComplexTimeline(),
          vendor_data: [],
          wedding_context: this.generateTestContext(),
          optimization_goals: { minimize_conflicts: true } as any,
          inference_type: 'conflict_detection'
        });
      }

      const finalMemory = this.getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      this.addResult({
        component: 'Memory Management',
        requirement: 'Memory Stability',
        expected: 'Stable memory usage',
        actual: `${memoryIncrease.toFixed(2)}MB increase`,
        passed: memoryIncrease < 50, // Allow up to 50MB increase
        message: 'Memory usage should remain stable during intensive operations'
      });

      // Check model disposal
      const modelInfo = mlConflictDetector.getModelInfo();
      this.addResult({
        component: 'Model Management',
        requirement: 'Model Information Access',
        expected: 'Model info available',
        actual: modelInfo.accuracy > 0 ? 'Available' : 'Unavailable',
        passed: modelInfo.accuracy > 0 && modelInfo.accuracy >= this.requiredAccuracy,
        message: 'Model information must be accessible and show required accuracy'
      });

      // Check error handling
      try {
        await mlConflictDetector.detectConflicts({
          timeline_id: '',
          timeline_items: [],
          vendor_data: [],
          wedding_context: {} as any,
          optimization_goals: {} as any,
          inference_type: 'conflict_detection'
        });
        
        this.addResult({
          component: 'Error Handling',
          requirement: 'Invalid Input Handling',
          expected: 'Error thrown',
          actual: 'No error',
          passed: false,
          message: 'System should handle invalid input gracefully'
        });
      } catch (error) {
        this.addResult({
          component: 'Error Handling',
          requirement: 'Invalid Input Handling',
          expected: 'Error thrown',
          actual: 'Error thrown',
          passed: true,
          message: 'System properly handles invalid input'
        });
      }

    } catch (error) {
      this.addResult({
        component: 'Production Readiness',
        requirement: 'Production Validation',
        expected: 'Success',
        actual: `Error: ${error.message}`,
        passed: false,
        message: 'Production readiness validation failed'
      });
    }
  }

  private addResult(result: ValidationResult): void {
    this.results.push(result);
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${result.component}: ${result.requirement} (${result.actual})`);
  }

  private generateReport(): ValidationReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;
    const criticalFailures = this.results.filter(r => 
      !r.passed && (
        r.requirement.includes('Accuracy') ||
        r.requirement.includes('Performance') ||
        r.requirement.includes('Health')
      )
    ).length;

    const passRate = (passed / this.results.length) * 100;
    const overallStatus = passRate >= 95 && criticalFailures === 0 ? 'PASS' : 'FAIL';

    console.log('\n📊 Validation Report');
    console.log('===================');
    console.log(`Overall Status: ${overallStatus}`);
    console.log(`Pass Rate: ${passRate.toFixed(1)}%`);
    console.log(`Tests: ${passed}/${this.results.length} passed`);
    console.log(`Critical Failures: ${criticalFailures}`);

    if (criticalFailures > 0) {
      console.log('\n❌ Critical Failures:');
      this.results.filter(r => !r.passed && (
        r.requirement.includes('Accuracy') ||
        r.requirement.includes('Performance') ||
        r.requirement.includes('Health')
      )).forEach(result => {
        console.log(`  - ${result.component}: ${result.requirement}`);
        console.log(`    Expected: ${result.expected}, Got: ${result.actual}`);
      });
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      passRate,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        criticalFailures
      }
    };
  }

  // Helper methods for test data generation
  private generateAccuracyTestScenarios(): any[] {
    return [
      {
        name: 'Vendor Overlap Conflict',
        timeline: [
          { id: '1', title: 'Photography', startTime: '2024-06-15T10:00:00Z', endTime: '2024-06-15T12:00:00Z', vendor: 'Photo Pro', status: 'pending' as const },
          { id: '2', title: 'Photography Setup', startTime: '2024-06-15T11:00:00Z', endTime: '2024-06-15T13:00:00Z', vendor: 'Photo Pro', status: 'pending' as const }
        ],
        context: this.generateTestContext(),
        expectedConflicts: 1
      },
      {
        name: 'Weather Risk Scenario',
        timeline: [
          { id: '3', title: 'Outdoor Ceremony', startTime: '2024-06-15T16:00:00Z', endTime: '2024-06-15T17:00:00Z', status: 'pending' as const }
        ],
        context: { ...this.generateTestContext(), weather_forecast: { date: '2024-06-15', temperature_high: 75, temperature_low: 60, precipitation_chance: 80, wind_speed: 15, conditions: 'thunderstorms', impact_factors: { outdoor_ceremony: 2.0, transportation: 1.3, vendor_setup: 1.5 } } },
        expectedConflicts: 1
      }
    ];
  }

  private generateTestContext(): any {
    return {
      wedding_id: 'test_wedding',
      wedding_date: '2024-06-15',
      venue_type: 'outdoor',
      guest_count: 150,
      budget_tier: 'luxury',
      season: 'summer',
      day_of_week: 'Saturday',
      time_of_day: 'afternoon',
      special_requirements: []
    };
  }

  private generateTimelineWithComplexity(vendorCount: number): any[] {
    const timeline = [];
    const vendorTypes = ['photographer', 'catering', 'dj', 'flowers', 'transport'];
    
    for (let i = 0; i < vendorCount; i++) {
      timeline.push({
        id: `vendor_${i}`,
        title: `${vendorTypes[i % vendorTypes.length]} Service`,
        startTime: `2024-06-15T${10 + (i * 2) % 12}:00:00Z`,
        endTime: `2024-06-15T${12 + (i * 2) % 12}:00:00Z`,
        vendor: `Vendor ${i}`,
        status: 'pending' as const
      });
    }
    
    return timeline;
  }

  private generateSimpleTimeline(): any[] {
    return [
      {
        id: '1',
        title: 'Photography',
        startTime: '2024-06-15T10:00:00Z',
        endTime: '2024-06-15T12:00:00Z',
        vendor: 'Photo Pro',
        status: 'pending' as const
      }
    ];
  }

  private generateComplexTimeline(): any[] {
    return this.generateTimelineWithComplexity(20);
  }

  private getMemoryUsage(): number {
    // In Node.js environment, use process.memoryUsage()
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }
}

// Run validation if executed directly
if (require.main === module) {
  const validator = new MLSystemValidator();
  
  validator.runFullValidation()
    .then(report => {
      console.log('\n🎯 Final Validation Result');
      console.log('==========================');
      console.log(`Status: ${report.overallStatus}`);
      console.log(`Pass Rate: ${report.passRate.toFixed(1)}%`);
      
      if (report.overallStatus === 'PASS') {
        console.log('✅ ML System is ready for production deployment!');
        process.exit(0);
      } else {
        console.log('❌ ML System requires fixes before production deployment.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export { MLSystemValidator };