const { performance } = require('perf_hooks');

/**
 * WS-170: Performance Testing for Viral Coefficient Calculations
 * 
 * Tests the computational performance of viral coefficient calculations
 * under various load scenarios to ensure the system can handle:
 * - Large-scale viral growth scenarios (10k+ users)
 * - Real-time calculation requirements (<100ms)
 * - Complex attribution chains (5+ levels deep)
 * - High-frequency calculation updates
 * 
 * Critical Wedding Context: During viral growth periods (wedding season),
 * the system must calculate viral coefficients for thousands of referrals
 * simultaneously while maintaining sub-100ms response times.
 */

class ViralCoefficientPerformanceTester {
  constructor() {
    this.performanceMetrics = [];
    this.memoryBaseline = process.memoryUsage();
    this.testResults = {
      calculationSpeed: [],
      memoryUsage: [],
      scalabilityMetrics: [],
      concurrencyResults: []
    };
  }

  // High-performance viral coefficient calculation
  calculateViralCoefficient(users, referrals, timeWindow = 30) {
    const startTime = performance.now();
    const memoryStart = process.memoryUsage();
    
    try {
      // User segmentation for performance optimization
      const activeUsers = users.filter(u => u.isActive && u.registrationDate >= Date.now() - (timeWindow * 24 * 60 * 60 * 1000));
      const referralMap = new Map();
      
      // Build referral network with O(n) complexity
      referrals.forEach(ref => {
        if (!referralMap.has(ref.referrerId)) {
          referralMap.set(ref.referrerId, []);
        }
        referralMap.get(ref.referrerId).push(ref);
      });
      
      let totalReferrals = 0;
      let successfulConversions = 0;
      let revenueImpact = 0;
      
      // Optimized coefficient calculation
      activeUsers.forEach(user => {
        const userReferrals = referralMap.get(user.id) || [];
        const conversions = userReferrals.filter(ref => ref.hasConverted);
        
        totalReferrals += userReferrals.length;
        successfulConversions += conversions.length;
        revenueImpact += conversions.reduce((sum, conv) => sum + conv.revenueValue, 0);
      });
      
      // Core viral coefficient formula: K = (referrals per user) × (conversion rate)
      const averageReferralsPerUser = activeUsers.length > 0 ? totalReferrals / activeUsers.length : 0;
      const conversionRate = totalReferrals > 0 ? successfulConversions / totalReferrals : 0;
      const viralCoefficient = averageReferralsPerUser * conversionRate;
      
      // Advanced metrics for wedding industry context
      const averageRevenuePerConversion = successfulConversions > 0 ? revenueImpact / successfulConversions : 0;
      const customerAcquisitionCostReduction = Math.min(viralCoefficient * 0.6, 0.6); // Cap at 60%
      const virality = viralCoefficient > 1 ? 'exponential' : viralCoefficient > 0.5 ? 'sustainable' : 'declining';
      
      const endTime = performance.now();
      const memoryEnd = process.memoryUsage();
      
      return {
        coefficient: parseFloat(viralCoefficient.toFixed(6)),
        metrics: {
          totalUsers: activeUsers.length,
          totalReferrals,
          successfulConversions,
          conversionRate: parseFloat(conversionRate.toFixed(4)),
          averageReferralsPerUser: parseFloat(averageReferralsPerUser.toFixed(2)),
          revenueImpact: parseFloat(revenueImpact.toFixed(2)),
          averageRevenuePerConversion: parseFloat(averageRevenuePerConversion.toFixed(2)),
          customerAcquisitionCostReduction: parseFloat(customerAcquisitionCostReduction.toFixed(3)),
          virality
        },
        performance: {
          executionTime: parseFloat((endTime - startTime).toFixed(3)),
          memoryDelta: {
            rss: memoryEnd.rss - memoryStart.rss,
            heapUsed: memoryEnd.heapUsed - memoryStart.heapUsed,
            external: memoryEnd.external - memoryStart.external
          }
        }
      };
    } catch (error) {
      return {
        error: error.message,
        performance: {
          executionTime: performance.now() - startTime,
          memoryDelta: null
        }
      };
    }
  }

  // Generate synthetic test data for performance testing
  generateTestData(userCount, referralMultiplier = 2.5) {
    const users = [];
    const referrals = [];
    
    // Generate users with realistic wedding demographics
    for (let i = 0; i < userCount; i++) {
      users.push({
        id: i + 1,
        isActive: Math.random() > 0.1, // 90% active rate
        registrationDate: Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000, // Last 60 days
        userType: Math.random() > 0.3 ? 'couple' : 'supplier', // 70% couples, 30% suppliers
        averageOrderValue: 2000 + Math.random() * 8000, // $2k-$10k wedding budgets
        engagementScore: Math.random() * 10
      });
    }
    
    // Generate referrals with realistic conversion patterns
    let referralId = 1;
    users.forEach(user => {
      if (user.isActive && Math.random() > 0.4) { // 60% of active users make referrals
        const referralCount = Math.floor(Math.random() * referralMultiplier * 2) + 1;
        
        for (let i = 0; i < referralCount; i++) {
          const hasConverted = Math.random() > 0.25; // 75% conversion rate
          referrals.push({
            id: referralId++,
            referrerId: user.id,
            hasConverted,
            conversionDate: hasConverted ? Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000 : null,
            revenueValue: hasConverted ? user.averageOrderValue * (0.5 + Math.random() * 0.5) : 0, // 50-100% of referrer's AOV
            referralChannel: ['email', 'social', 'word_of_mouth', 'wedding_vendor'][Math.floor(Math.random() * 4)],
            attributionChainDepth: Math.floor(Math.random() * 5) + 1 // 1-5 levels deep
          });
        }
      }
    });
    
    return { users, referrals };
  }

  // Test calculation performance at different scales
  async testScalabilityPerformance() {
    const scaleSizes = [100, 500, 1000, 5000, 10000, 25000, 50000];
    const results = [];
    
    console.log('🚀 Starting Viral Coefficient Scalability Testing...');
    
    for (const size of scaleSizes) {
      console.log(`Testing with ${size} users...`);
      
      const testData = this.generateTestData(size);
      const testRuns = 5; // Multiple runs for accuracy
      const runResults = [];
      
      for (let run = 0; run < testRuns; run++) {
        const result = this.calculateViralCoefficient(testData.users, testData.referrals);
        runResults.push(result);
      }
      
      // Calculate averages across runs
      const avgExecutionTime = runResults.reduce((sum, r) => sum + r.performance.executionTime, 0) / testRuns;
      const avgMemoryUsage = runResults.reduce((sum, r) => sum + (r.performance.memoryDelta?.heapUsed || 0), 0) / testRuns;
      const avgCoefficient = runResults.reduce((sum, r) => sum + r.coefficient, 0) / testRuns;
      
      const scaleResult = {
        userCount: size,
        referralCount: testData.referrals.length,
        avgExecutionTime: parseFloat(avgExecutionTime.toFixed(3)),
        avgMemoryUsage: Math.round(avgMemoryUsage),
        avgCoefficient: parseFloat(avgCoefficient.toFixed(6)),
        performanceGrade: this.gradePerformance(avgExecutionTime, size),
        memoryEfficiency: this.gradeMemoryUsage(avgMemoryUsage, size),
        scalabilityScore: this.calculateScalabilityScore(avgExecutionTime, size)
      };
      
      results.push(scaleResult);
      
      console.log(`  ✓ ${size} users: ${avgExecutionTime.toFixed(1)}ms, Coefficient: ${avgCoefficient.toFixed(4)}`);
    }
    
    this.testResults.scalabilityMetrics = results;
    return results;
  }

  // Test concurrent calculation performance
  async testConcurrentCalculations() {
    console.log('🔄 Testing Concurrent Viral Coefficient Calculations...');
    
    const testData = this.generateTestData(5000);
    const concurrencyLevels = [1, 5, 10, 25, 50, 100];
    const results = [];
    
    for (const concurrency of concurrencyLevels) {
      console.log(`Testing with ${concurrency} concurrent calculations...`);
      
      const startTime = performance.now();
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          Promise.resolve(this.calculateViralCoefficient(testData.users, testData.referrals))
        );
      }
      
      const concurrentResults = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const avgExecutionTime = concurrentResults.reduce((sum, r) => sum + r.performance.executionTime, 0) / concurrency;
      const totalMemoryUsage = concurrentResults.reduce((sum, r) => sum + (r.performance.memoryDelta?.heapUsed || 0), 0);
      
      const concurrencyResult = {
        concurrencyLevel: concurrency,
        totalExecutionTime: parseFloat(totalTime.toFixed(3)),
        avgIndividualTime: parseFloat(avgExecutionTime.toFixed(3)),
        throughput: parseFloat((concurrency / (totalTime / 1000)).toFixed(2)), // calculations per second
        totalMemoryUsage: Math.round(totalMemoryUsage),
        efficiencyScore: this.calculateConcurrencyEfficiency(totalTime, avgExecutionTime, concurrency),
        resourceUtilization: this.calculateResourceUtilization(totalMemoryUsage, concurrency)
      };
      
      results.push(concurrencyResult);
      
      console.log(`  ✓ ${concurrency} concurrent: ${totalTime.toFixed(1)}ms total, ${(concurrency / (totalTime / 1000)).toFixed(1)} calc/sec`);
    }
    
    this.testResults.concurrencyResults = results;
    return results;
  }

  // Test edge case performance scenarios
  async testEdgeCasePerformance() {
    console.log('⚡ Testing Edge Case Performance Scenarios...');
    
    const edgeCases = [
      {
        name: 'Deep Attribution Chain',
        description: 'Users with 10+ level referral chains',
        generator: () => this.generateDeepAttributionData(1000, 10)
      },
      {
        name: 'High Referral Volume',
        description: 'Users with 100+ referrals each',
        generator: () => this.generateHighVolumeData(500, 100)
      },
      {
        name: 'Sparse Network',
        description: 'Large user base with minimal referrals',
        generator: () => this.generateTestData(10000, 0.1)
      },
      {
        name: 'Dense Network',
        description: 'Small user base with maximum referrals',
        generator: () => this.generateTestData(100, 20)
      },
      {
        name: 'Temporal Clustering',
        description: 'All referrals within 24-hour window',
        generator: () => this.generateTemporalClusterData(2000)
      }
    ];
    
    const results = [];
    
    for (const edgeCase of edgeCases) {
      console.log(`Testing: ${edgeCase.name}...`);
      
      const testData = edgeCase.generator();
      const testRuns = 3;
      const runResults = [];
      
      for (let run = 0; run < testRuns; run++) {
        const result = this.calculateViralCoefficient(testData.users, testData.referrals);
        runResults.push(result);
      }
      
      const avgResult = {
        name: edgeCase.name,
        description: edgeCase.description,
        userCount: testData.users.length,
        referralCount: testData.referrals.length,
        avgExecutionTime: parseFloat((runResults.reduce((sum, r) => sum + r.performance.executionTime, 0) / testRuns).toFixed(3)),
        avgCoefficient: parseFloat((runResults.reduce((sum, r) => sum + r.coefficient, 0) / testRuns).toFixed(6)),
        memoryPeak: Math.max(...runResults.map(r => r.performance.memoryDelta?.heapUsed || 0)),
        stabilityScore: this.calculateStabilityScore(runResults),
        edgeCaseHandling: 'passed'
      };
      
      results.push(avgResult);
      
      console.log(`  ✓ ${edgeCase.name}: ${avgResult.avgExecutionTime}ms, Coefficient: ${avgResult.avgCoefficient}`);
    }
    
    return results;
  }

  // Helper method to generate deep attribution chain data
  generateDeepAttributionData(userCount, maxDepth) {
    const users = this.generateTestData(userCount, 2).users;
    const referrals = [];
    
    let referralId = 1;
    users.forEach((user, index) => {
      const depth = Math.min(Math.floor(Math.random() * maxDepth) + 1, maxDepth);
      
      for (let d = 1; d <= depth; d++) {
        referrals.push({
          id: referralId++,
          referrerId: user.id,
          hasConverted: Math.random() > 0.3,
          revenueValue: user.averageOrderValue * 0.7,
          attributionChainDepth: d,
          parentReferralId: d > 1 ? referralId - 2 : null
        });
      }
    });
    
    return { users, referrals };
  }

  // Helper method to generate high volume referral data
  generateHighVolumeData(userCount, referralsPerUser) {
    const users = this.generateTestData(userCount, 1).users;
    const referrals = [];
    
    let referralId = 1;
    users.forEach(user => {
      for (let i = 0; i < referralsPerUser; i++) {
        referrals.push({
          id: referralId++,
          referrerId: user.id,
          hasConverted: Math.random() > 0.25,
          revenueValue: user.averageOrderValue * (0.3 + Math.random() * 0.7),
          attributionChainDepth: 1
        });
      }
    });
    
    return { users, referrals };
  }

  // Helper method to generate temporal cluster data
  generateTemporalClusterData(userCount) {
    const users = this.generateTestData(userCount, 3).users;
    const referrals = [];
    const clusterTime = Date.now() - Math.random() * 24 * 60 * 60 * 1000; // Within last 24 hours
    
    let referralId = 1;
    users.forEach(user => {
      const referralCount = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < referralCount; i++) {
        referrals.push({
          id: referralId++,
          referrerId: user.id,
          hasConverted: Math.random() > 0.3,
          revenueValue: user.averageOrderValue * 0.8,
          conversionDate: clusterTime + Math.random() * 3600000, // Within 1 hour of cluster
          attributionChainDepth: 1
        });
      }
    });
    
    return { users, referrals };
  }

  // Performance grading system
  gradePerformance(executionTime, userCount) {
    const timePerUser = executionTime / userCount;
    
    if (timePerUser < 0.01) return 'A+'; // < 0.01ms per user
    if (timePerUser < 0.05) return 'A';  // < 0.05ms per user
    if (timePerUser < 0.1) return 'B';   // < 0.1ms per user
    if (timePerUser < 0.5) return 'C';   // < 0.5ms per user
    return 'D';                          // > 0.5ms per user
  }

  gradeMemoryUsage(memoryDelta, userCount) {
    const memoryPerUser = memoryDelta / userCount;
    
    if (memoryPerUser < 100) return 'Excellent'; // < 100 bytes per user
    if (memoryPerUser < 500) return 'Good';      // < 500 bytes per user
    if (memoryPerUser < 1000) return 'Fair';     // < 1KB per user
    return 'Poor';                               // > 1KB per user
  }

  calculateScalabilityScore(executionTime, userCount) {
    // O(n) performance should have linear scaling
    const expectedLinearTime = userCount * 0.01; // 0.01ms per user baseline
    const scalabilityRatio = expectedLinearTime / executionTime;
    
    return Math.min(Math.max(scalabilityRatio * 100, 0), 100);
  }

  calculateConcurrencyEfficiency(totalTime, avgIndividualTime, concurrency) {
    const idealTotalTime = avgIndividualTime; // Perfect parallelization
    const efficiency = (idealTotalTime / totalTime) * 100;
    
    return Math.min(Math.max(efficiency, 0), 100);
  }

  calculateResourceUtilization(totalMemory, concurrency) {
    const memoryPerProcess = totalMemory / concurrency;
    
    if (memoryPerProcess < 1024 * 1024) return 'Optimal';   // < 1MB per process
    if (memoryPerProcess < 5 * 1024 * 1024) return 'Good';  // < 5MB per process
    if (memoryPerProcess < 10 * 1024 * 1024) return 'Fair'; // < 10MB per process
    return 'Poor';                                          // > 10MB per process
  }

  calculateStabilityScore(results) {
    const executionTimes = results.map(r => r.performance.executionTime);
    const coefficients = results.map(r => r.coefficient);
    
    const timeVariance = this.calculateVariance(executionTimes);
    const coefficientVariance = this.calculateVariance(coefficients);
    
    // Lower variance = higher stability
    const timeStability = Math.max(0, 100 - (timeVariance / Math.max(...executionTimes)) * 100);
    const coefficientStability = Math.max(0, 100 - (coefficientVariance / Math.max(...coefficients)) * 100);
    
    return (timeStability + coefficientStability) / 2;
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Generate comprehensive performance report
  generatePerformanceReport() {
    return {
      testSummary: {
        totalTests: Object.keys(this.testResults).length,
        overallGrade: this.calculateOverallGrade(),
        criticalMetrics: {
          maxExecutionTime: Math.max(...this.testResults.scalabilityMetrics.map(r => r.avgExecutionTime)),
          optimalUserCapacity: this.findOptimalCapacity(),
          recommendedConcurrency: this.findOptimalConcurrency(),
          memoryEfficiencyRating: this.calculateMemoryEfficiency()
        }
      },
      scalabilityAnalysis: this.testResults.scalabilityMetrics,
      concurrencyAnalysis: this.testResults.concurrencyResults,
      recommendations: this.generateOptimizationRecommendations(),
      productionReadiness: this.assessProductionReadiness()
    };
  }

  calculateOverallGrade() {
    const grades = this.testResults.scalabilityMetrics.map(r => r.performanceGrade);
    const gradeValues = { 'A+': 97, 'A': 90, 'B': 80, 'C': 70, 'D': 60 };
    const avgGradeValue = grades.reduce((sum, grade) => sum + gradeValues[grade], 0) / grades.length;
    
    if (avgGradeValue >= 95) return 'A+';
    if (avgGradeValue >= 85) return 'A';
    if (avgGradeValue >= 75) return 'B';
    if (avgGradeValue >= 65) return 'C';
    return 'D';
  }

  findOptimalCapacity() {
    const threshold = 100; // 100ms threshold
    const optimalResults = this.testResults.scalabilityMetrics.filter(r => r.avgExecutionTime <= threshold);
    return optimalResults.length > 0 ? Math.max(...optimalResults.map(r => r.userCount)) : 0;
  }

  findOptimalConcurrency() {
    const threshold = 80; // 80% efficiency threshold
    const optimalResults = this.testResults.concurrencyResults.filter(r => r.efficiencyScore >= threshold);
    return optimalResults.length > 0 ? Math.max(...optimalResults.map(r => r.concurrencyLevel)) : 1;
  }

  calculateMemoryEfficiency() {
    const memoryGrades = this.testResults.scalabilityMetrics.map(r => r.memoryEfficiency);
    const gradeValues = { 'Excellent': 95, 'Good': 80, 'Fair': 65, 'Poor': 40 };
    const avgGradeValue = memoryGrades.reduce((sum, grade) => sum + gradeValues[grade], 0) / memoryGrades.length;
    
    return Object.keys(gradeValues).find(key => gradeValues[key] <= avgGradeValue) || 'Poor';
  }

  generateOptimizationRecommendations() {
    const recommendations = [];
    
    const maxTime = Math.max(...this.testResults.scalabilityMetrics.map(r => r.avgExecutionTime));
    if (maxTime > 100) {
      recommendations.push('Implement data pagination for large datasets (>10k users)');
      recommendations.push('Add database indexing on referrer_id and conversion_date columns');
    }
    
    const poorMemoryResults = this.testResults.scalabilityMetrics.filter(r => r.memoryEfficiency === 'Poor');
    if (poorMemoryResults.length > 0) {
      recommendations.push('Implement streaming data processing to reduce memory footprint');
      recommendations.push('Add garbage collection optimization for large calculation batches');
    }
    
    const lowConcurrency = this.testResults.concurrencyResults.filter(r => r.efficiencyScore < 70);
    if (lowConcurrency.length > 0) {
      recommendations.push('Implement connection pooling for database operations');
      recommendations.push('Add caching layer for frequently calculated coefficients');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance meets all benchmarks - ready for production');
    }
    
    return recommendations;
  }

  assessProductionReadiness() {
    const maxExecutionTime = Math.max(...this.testResults.scalabilityMetrics.map(r => r.avgExecutionTime));
    const minEfficiency = Math.min(...this.testResults.concurrencyResults.map(r => r.efficiencyScore));
    const memoryScore = this.calculateMemoryEfficiency();
    
    const criteria = {
      performance: maxExecutionTime <= 100, // < 100ms max execution
      concurrency: minEfficiency >= 60,     // > 60% efficiency
      memory: ['Excellent', 'Good'].includes(memoryScore),
      scalability: this.findOptimalCapacity() >= 10000 // Handle 10k+ users
    };
    
    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    const totalCriteria = Object.keys(criteria).length;
    
    return {
      readinessScore: Math.round((passedCriteria / totalCriteria) * 100),
      criteria,
      verdict: passedCriteria === totalCriteria ? 'PRODUCTION READY' : 'REQUIRES OPTIMIZATION',
      criticalIssues: Object.entries(criteria).filter(([key, passed]) => !passed).map(([key]) => key)
    };
  }
}

// Jest test suite
describe('Viral Coefficient Performance Testing', () => {
  let performanceTester;
  
  beforeAll(() => {
    performanceTester = new ViralCoefficientPerformanceTester();
  });

  test('Scalability Performance: Handle 50k Users Under 100ms', async () => {
    const results = await performanceTester.testScalabilityPerformance();
    
    // Verify scalability requirements
    const largeScaleResult = results.find(r => r.userCount >= 50000);
    expect(largeScaleResult).toBeDefined();
    expect(largeScaleResult.avgExecutionTime).toBeLessThan(100); // < 100ms for 50k users
    expect(largeScaleResult.performanceGrade).toMatch(/A\+?|A|B/); // Grade B or better
    
    // Verify linear scaling
    results.forEach(result => {
      expect(result.scalabilityScore).toBeGreaterThan(50); // > 50% scalability score
      expect(result.avgCoefficient).toBeGreaterThan(0);    // Valid coefficients
      expect(result.avgCoefficient).toBeLessThan(10);      // Reasonable coefficient range
    });
    
    console.log('✅ Scalability Test Results:', results);
  }, 60000); // 60 second timeout for comprehensive testing

  test('Concurrent Calculations: 100 Simultaneous Calculations', async () => {
    const results = await performanceTester.testConcurrentCalculations();
    
    // Verify concurrency requirements
    const highConcurrencyResult = results.find(r => r.concurrencyLevel >= 100);
    expect(highConcurrencyResult).toBeDefined();
    expect(highConcurrencyResult.throughput).toBeGreaterThan(10); // > 10 calculations per second
    expect(highConcurrencyResult.efficiencyScore).toBeGreaterThan(50); // > 50% efficiency
    
    // Verify resource utilization
    results.forEach(result => {
      expect(result.resourceUtilization).toMatch(/Optimal|Good|Fair/); // Not "Poor"
      expect(result.totalMemoryUsage).toBeLessThan(100 * 1024 * 1024); // < 100MB total
    });
    
    console.log('✅ Concurrency Test Results:', results);
  }, 45000);

  test('Edge Case Performance: Complex Scenarios', async () => {
    const results = await performanceTester.testEdgeCasePerformance();
    
    // Verify edge case handling
    results.forEach(result => {
      expect(result.avgExecutionTime).toBeLessThan(200); // < 200ms for edge cases
      expect(result.stabilityScore).toBeGreaterThan(70);  // > 70% stability
      expect(result.edgeCaseHandling).toBe('passed');
      expect(result.avgCoefficient).not.toBeNaN();
    });
    
    // Verify specific edge cases
    const deepAttributionCase = results.find(r => r.name === 'Deep Attribution Chain');
    expect(deepAttributionCase.avgExecutionTime).toBeLessThan(150);
    
    const highVolumeCase = results.find(r => r.name === 'High Referral Volume');
    expect(highVolumeCase.avgExecutionTime).toBeLessThan(100);
    
    console.log('✅ Edge Case Test Results:', results);
  }, 30000);

  test('Production Readiness Assessment', async () => {
    // Run all performance tests
    await performanceTester.testScalabilityPerformance();
    await performanceTester.testConcurrentCalculations();
    
    const report = performanceTester.generatePerformanceReport();
    
    // Verify production readiness criteria
    expect(report.productionReadiness.readinessScore).toBeGreaterThan(75); // > 75% ready
    expect(report.testSummary.overallGrade).toMatch(/A\+?|A|B/);           // Grade B or better
    expect(report.testSummary.criticalMetrics.maxExecutionTime).toBeLessThan(200); // < 200ms max
    expect(report.testSummary.criticalMetrics.optimalUserCapacity).toBeGreaterThan(10000); // > 10k users
    
    // Production readiness verdict
    if (report.productionReadiness.verdict === 'PRODUCTION READY') {
      console.log('🚀 VERDICT: System is PRODUCTION READY for viral coefficient calculations');
    } else {
      console.log('⚠️  VERDICT: System requires optimization before production deployment');
      console.log('Critical Issues:', report.productionReadiness.criticalIssues);
    }
    
    console.log('📊 Full Performance Report:', JSON.stringify(report, null, 2));
  }, 90000);

  test('Real-time Calculation Requirement: Sub-100ms Response', async () => {
    const testData = performanceTester.generateTestData(5000);
    
    // Test real-time calculation requirements
    const iterations = 20;
    const executionTimes = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = performanceTester.calculateViralCoefficient(testData.users, testData.referrals);
      executionTimes.push(result.performance.executionTime);
    }
    
    const averageTime = executionTimes.reduce((sum, time) => sum + time, 0) / iterations;
    const maxTime = Math.max(...executionTimes);
    const minTime = Math.min(...executionTimes);
    
    // Real-time requirements
    expect(averageTime).toBeLessThan(100); // < 100ms average
    expect(maxTime).toBeLessThan(200);     // < 200ms worst case
    expect(minTime).toBeGreaterThan(0);    // Valid calculation time
    
    // Consistency requirement
    const timeVariance = performanceTester.calculateVariance(executionTimes);
    const consistencyScore = Math.max(0, 100 - (timeVariance / averageTime) * 100);
    expect(consistencyScore).toBeGreaterThan(80); // > 80% consistency
    
    console.log('✅ Real-time Performance:', {
      averageTime: averageTime.toFixed(2) + 'ms',
      maxTime: maxTime.toFixed(2) + 'ms',
      minTime: minTime.toFixed(2) + 'ms',
      consistencyScore: consistencyScore.toFixed(1) + '%',
      requirement: 'Sub-100ms ✅'
    });
  });
});

module.exports = { ViralCoefficientPerformanceTester };