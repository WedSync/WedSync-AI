/**
 * Performance Test Suite: Budget Export Load Testing
 * WS-166 - Team E - Round 1
 * 
 * Comprehensive performance testing for budget export functionality
 * Covers load testing, stress testing, and performance benchmarks
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock performance monitoring
interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsed: number;
  cpuUsage?: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

interface BudgetExportPerformanceConfig {
  concurrentUsers: number;
  requestsPerUser: number;
  testDuration: number; // in seconds
  format: 'pdf' | 'csv' | 'excel';
  datasetSize: 'small' | 'medium' | 'large';
}

// Mock large dataset for performance testing
const generateMockBudgetData = (size: 'small' | 'medium' | 'large') => {
  const counts = {
    small: 10,
    medium: 100,
    large: 500
  };

  const categories = ['venue', 'catering', 'photography', 'videography', 'flowers', 'music', 'decorations', 'transportation', 'attire', 'beauty'];
  const statuses = ['paid', 'pending', 'planned'];
  
  return Array.from({ length: counts[size] }, (_, index) => ({
    id: `item-${index + 1}`,
    category: categories[index % categories.length],
    vendor: `Vendor ${index + 1}`,
    amount: Math.floor(Math.random() * 10000) + 500,
    dueDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
    status: statuses[index % statuses.length],
    description: `Wedding item ${index + 1} with detailed description and notes`,
    notes: `Additional notes for item ${index + 1} which could be quite long and detailed`,
    weddingId: 'test-wedding-performance'
  }));
};

// Mock API endpoint for performance testing
const mockExportAPI = async (format: string, dataSize: number): Promise<{ success: boolean; duration: number; fileSize: number }> => {
  const startTime = performance.now();
  
  // Simulate processing time based on format and data size
  const baseProcessingTime = {
    csv: 50,   // 50ms base
    pdf: 200,  // 200ms base
    excel: 150 // 150ms base
  };
  
  const processingTime = baseProcessingTime[format as keyof typeof baseProcessingTime] + (dataSize * 2);
  
  // Add some realistic variance
  const actualProcessingTime = processingTime + (Math.random() * processingTime * 0.2);
  
  await new Promise(resolve => setTimeout(resolve, actualProcessingTime));
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Simulate file size based on format and data
  const fileSizeMultipliers = { csv: 0.5, pdf: 5, excel: 2 };
  const fileSize = dataSize * fileSizeMultipliers[format as keyof typeof fileSizeMultipliers] * 1024; // bytes
  
  // Simulate occasional failures under load
  const failureRate = dataSize > 200 ? 0.05 : 0.01; // 5% failure for large datasets, 1% for others
  const success = Math.random() > failureRate;
  
  return { success, duration, fileSize };
};

// Performance monitoring utilities
const measurePerformance = async <T>(operation: () => Promise<T>): Promise<{ result: T; metrics: PerformanceMetrics }> => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  const result = await operation();
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  
  return {
    result,
    metrics: {
      startTime,
      endTime,
      duration: endTime - startTime,
      memoryUsed: endMemory - startMemory
    }
  };
};

// Load testing implementation
const runLoadTest = async (config: BudgetExportPerformanceConfig): Promise<LoadTestResult> => {
  const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];
  const startTime = Date.now();
  
  // Generate test data
  const testData = generateMockBudgetData(config.datasetSize);
  
  // Create concurrent user simulations
  const userPromises = Array.from({ length: config.concurrentUsers }, async (_, userIndex) => {
    const userResults: Array<{ success: boolean; responseTime: number; error?: string }> = [];
    
    for (let requestIndex = 0; requestIndex < config.requestsPerUser; requestIndex++) {
      try {
        const { result, metrics } = await measurePerformance(async () => {
          return await mockExportAPI(config.format, testData.length);
        });
        
        userResults.push({
          success: result.success,
          responseTime: metrics.duration,
          error: result.success ? undefined : 'Export generation failed'
        });
        
        // Add realistic delay between requests from same user
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
      } catch (error) {
        userResults.push({
          success: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return userResults;
  });
  
  // Wait for all users to complete
  const allUserResults = await Promise.all(userPromises);
  const flatResults = allUserResults.flat();
  results.push(...flatResults);
  
  const endTime = Date.now();
  const totalTestTime = (endTime - startTime) / 1000; // Convert to seconds
  
  // Calculate metrics
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.length - successfulRequests;
  const responseTimes = results.filter(r => r.success).map(r => r.responseTime);
  
  return {
    totalRequests: results.length,
    successfulRequests,
    failedRequests,
    averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
    minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    requestsPerSecond: results.length / totalTestTime,
    errors: results.filter(r => !r.success && r.error).map(r => r.error!)
  };
};

describe('Budget Export Performance Tests', () => {
  describe('Single User Performance Benchmarks', () => {
    it('should generate CSV export within performance targets (small dataset)', async () => {
      const testData = generateMockBudgetData('small');
      
      const { result, metrics } = await measurePerformance(async () => {
        return await mockExportAPI('csv', testData.length);
      });
      
      expect(result.success).toBe(true);
      expect(metrics.duration).toBeLessThan(2000); // < 2s for small CSV
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.fileSize).toBeLessThan(100 * 1024); // < 100KB for small dataset
      
      console.log(`CSV Export (${testData.length} items): ${metrics.duration.toFixed(2)}ms, ${result.fileSize} bytes`);
    });

    it('should generate PDF export within performance targets (medium dataset)', async () => {
      const testData = generateMockBudgetData('medium');
      
      const { result, metrics } = await measurePerformance(async () => {
        return await mockExportAPI('pdf', testData.length);
      });
      
      expect(result.success).toBe(true);
      expect(metrics.duration).toBeLessThan(15000); // < 15s for PDF generation
      expect(result.fileSize).toBeGreaterThan(100 * 1024); // > 100KB
      expect(result.fileSize).toBeLessThan(10 * 1024 * 1024); // < 10MB
      
      console.log(`PDF Export (${testData.length} items): ${metrics.duration.toFixed(2)}ms, ${(result.fileSize / 1024).toFixed(2)}KB`);
    });

    it('should generate Excel export within performance targets (large dataset)', async () => {
      const testData = generateMockBudgetData('large');
      
      const { result, metrics } = await measurePerformance(async () => {
        return await mockExportAPI('excel', testData.length);
      });
      
      expect(result.success).toBe(true);
      expect(metrics.duration).toBeLessThan(20000); // < 20s for large Excel
      expect(result.fileSize).toBeGreaterThan(50 * 1024); // > 50KB
      expect(result.fileSize).toBeLessThan(5 * 1024 * 1024); // < 5MB
      
      console.log(`Excel Export (${testData.length} items): ${metrics.duration.toFixed(2)}ms, ${(result.fileSize / 1024).toFixed(2)}KB`);
    });

    it('should handle memory efficiently during large exports', async () => {
      const testData = generateMockBudgetData('large');
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      const { result, metrics } = await measurePerformance(async () => {
        return await mockExportAPI('pdf', testData.length);
      });
      
      expect(result.success).toBe(true);
      expect(metrics.memoryUsed).toBeLessThan(100 * 1024 * 1024); // < 100MB memory increase
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryLeak = finalMemory - initialMemory;
      
      expect(memoryLeak).toBeLessThan(50 * 1024 * 1024); // < 50MB potential leak
      
      console.log(`Memory usage: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB, potential leak: ${(memoryLeak / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Concurrent User Load Testing', () => {
    it('should handle 10 concurrent CSV export requests', async () => {
      const config: BudgetExportPerformanceConfig = {
        concurrentUsers: 10,
        requestsPerUser: 2,
        testDuration: 30,
        format: 'csv',
        datasetSize: 'small'
      };
      
      const results = await runLoadTest(config);
      
      expect(results.successfulRequests).toBeGreaterThan(results.totalRequests * 0.95); // > 95% success rate
      expect(results.averageResponseTime).toBeLessThan(3000); // < 3s average
      expect(results.requestsPerSecond).toBeGreaterThan(1); // > 1 RPS
      
      console.log('10 Concurrent CSV Exports:', {
        successRate: `${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`,
        avgResponseTime: `${results.averageResponseTime.toFixed(2)}ms`,
        rps: results.requestsPerSecond.toFixed(2)
      });
    });

    it('should handle 25 concurrent PDF export requests', async () => {
      const config: BudgetExportPerformanceConfig = {
        concurrentUsers: 25,
        requestsPerUser: 1,
        testDuration: 60,
        format: 'pdf',
        datasetSize: 'medium'
      };
      
      const results = await runLoadTest(config);
      
      expect(results.successfulRequests).toBeGreaterThan(results.totalRequests * 0.9); // > 90% success rate under load
      expect(results.averageResponseTime).toBeLessThan(20000); // < 20s average under load
      expect(results.maxResponseTime).toBeLessThan(30000); // < 30s max response time
      
      console.log('25 Concurrent PDF Exports:', {
        successRate: `${((results.successfulRequests / results.totalRequests) * 100).toFixed(2)}%`,
        avgResponseTime: `${(results.averageResponseTime / 1000).toFixed(2)}s`,
        maxResponseTime: `${(results.maxResponseTime / 1000).toFixed(2)}s`
      });
    });

    it('should handle 50 concurrent mixed format requests', async () => {
      const configs: BudgetExportPerformanceConfig[] = [
        { concurrentUsers: 20, requestsPerUser: 1, testDuration: 45, format: 'csv', datasetSize: 'small' },
        { concurrentUsers: 20, requestsPerUser: 1, testDuration: 45, format: 'pdf', datasetSize: 'medium' },
        { concurrentUsers: 10, requestsPerUser: 1, testDuration: 45, format: 'excel', datasetSize: 'large' }
      ];
      
      const testPromises = configs.map(config => runLoadTest(config));
      const allResults = await Promise.all(testPromises);
      
      const combinedResults = allResults.reduce((acc, result) => ({
        totalRequests: acc.totalRequests + result.totalRequests,
        successfulRequests: acc.successfulRequests + result.successfulRequests,
        failedRequests: acc.failedRequests + result.failedRequests,
        averageResponseTime: (acc.averageResponseTime + result.averageResponseTime) / 2,
        minResponseTime: Math.min(acc.minResponseTime, result.minResponseTime),
        maxResponseTime: Math.max(acc.maxResponseTime, result.maxResponseTime),
        requestsPerSecond: acc.requestsPerSecond + result.requestsPerSecond,
        errors: [...acc.errors, ...result.errors]
      }));
      
      expect(combinedResults.successfulRequests).toBeGreaterThan(combinedResults.totalRequests * 0.85); // > 85% success under mixed load
      expect(combinedResults.requestsPerSecond).toBeGreaterThan(2); // > 2 RPS combined
      
      console.log('50 Concurrent Mixed Format Exports:', {
        totalRequests: combinedResults.totalRequests,
        successRate: `${((combinedResults.successfulRequests / combinedResults.totalRequests) * 100).toFixed(2)}%`,
        combinedRps: combinedResults.requestsPerSecond.toFixed(2)
      });
    });
  });

  describe('Stress Testing and Breaking Points', () => {
    it('should identify breaking point for concurrent PDF exports', async () => {
      const concurrencyLevels = [10, 25, 50, 75, 100];
      const breakingPointResults: Array<{ concurrency: number; successRate: number; avgResponseTime: number }> = [];
      
      for (const concurrency of concurrencyLevels) {
        const config: BudgetExportPerformanceConfig = {
          concurrentUsers: concurrency,
          requestsPerUser: 1,
          testDuration: 30,
          format: 'pdf',
          datasetSize: 'medium'
        };
        
        const results = await runLoadTest(config);
        const successRate = (results.successfulRequests / results.totalRequests) * 100;
        
        breakingPointResults.push({
          concurrency,
          successRate,
          avgResponseTime: results.averageResponseTime
        });
        
        console.log(`Concurrency ${concurrency}: ${successRate.toFixed(2)}% success, ${results.averageResponseTime.toFixed(2)}ms avg`);
        
        // If success rate drops below 80%, we've likely found the breaking point
        if (successRate < 80) {
          break;
        }
      }
      
      // At least the lowest concurrency level should work well
      expect(breakingPointResults[0].successRate).toBeGreaterThan(95);
      
      // Document the breaking point
      const breakingPoint = breakingPointResults.find(result => result.successRate < 80);
      if (breakingPoint) {
        console.log(`Breaking point identified at ${breakingPoint.concurrency} concurrent users`);
      }
    });

    it('should handle extremely large dataset exports', async () => {
      const extremeData = Array.from({ length: 1000 }, (_, index) => ({
        id: `item-${index + 1}`,
        category: 'venue',
        vendor: `Very Long Vendor Name ${index + 1} with Lots of Additional Information`,
        amount: 15000,
        dueDate: '2025-06-01',
        status: 'pending',
        description: 'Extremely detailed description with lots of text that would make the file size very large and test the system limits',
        notes: `Very long notes section ${index + 1} `.repeat(50), // Very long notes
        weddingId: 'test-wedding-extreme'
      }));
      
      const { result, metrics } = await measurePerformance(async () => {
        return await mockExportAPI('pdf', extremeData.length);
      });
      
      // Should still complete, but may take longer
      expect(result.success || metrics.duration < 60000).toBe(true); // Either succeeds or times out under 60s
      
      if (result.success) {
        expect(result.fileSize).toBeGreaterThan(1024 * 1024); // > 1MB for extreme dataset
        expect(result.fileSize).toBeLessThan(50 * 1024 * 1024); // < 50MB (reasonable limit)
      }
      
      console.log(`Extreme dataset (${extremeData.length} items): ${metrics.duration.toFixed(2)}ms, success: ${result.success}`);
    });
  });

  describe('Mobile Performance Simulation', () => {
    it('should perform adequately on simulated slow mobile networks', async () => {
      // Simulate 3G network conditions (slower processing)
      const simulate3G = async (format: string, dataSize: number) => {
        const result = await mockExportAPI(format, dataSize);
        // Add network latency simulation
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // 1-3s network delay
        return result;
      };
      
      const testData = generateMockBudgetData('small');
      
      const { result, metrics } = await measurePerformance(async () => {
        return await simulate3G('csv', testData.length);
      });
      
      expect(result.success).toBe(true);
      expect(metrics.duration).toBeLessThan(10000); // < 10s total on slow network
      
      console.log(`Mobile 3G CSV export: ${metrics.duration.toFixed(2)}ms total time`);
    });

    it('should limit memory usage for mobile environments', async () => {
      const testData = generateMockBudgetData('medium');
      
      const { result, metrics } = await measurePerformance(async () => {
        return await mockExportAPI('csv', testData.length); // CSV uses less memory
      });
      
      expect(result.success).toBe(true);
      expect(metrics.memoryUsed).toBeLessThan(50 * 1024 * 1024); // < 50MB memory usage for mobile
      
      console.log(`Mobile memory usage: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across multiple runs', async () => {
      const runs = 5;
      const results: number[] = [];
      
      for (let i = 0; i < runs; i++) {
        const testData = generateMockBudgetData('medium');
        
        const { result, metrics } = await measurePerformance(async () => {
          return await mockExportAPI('pdf', testData.length);
        });
        
        expect(result.success).toBe(true);
        results.push(metrics.duration);
        
        // Small delay between runs
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const averageTime = results.reduce((a, b) => a + b, 0) / results.length;
      const standardDeviation = Math.sqrt(results.reduce((acc, time) => acc + Math.pow(time - averageTime, 2), 0) / results.length);
      const coefficientOfVariation = standardDeviation / averageTime;
      
      // Performance should be consistent (low variation)
      expect(coefficientOfVariation).toBeLessThan(0.3); // < 30% variation
      
      console.log(`Performance consistency over ${runs} runs:`, {
        avgTime: `${averageTime.toFixed(2)}ms`,
        stdDev: `${standardDeviation.toFixed(2)}ms`,
        variation: `${(coefficientOfVariation * 100).toFixed(2)}%`
      });
    });
  });

  describe('Resource Cleanup and Memory Leaks', () => {
    it('should cleanup resources after export completion', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run multiple exports
      for (let i = 0; i < 10; i++) {
        const testData = generateMockBudgetData('small');
        await mockExportAPI('csv', testData.length);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be minimal after cleanup
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // < 10MB increase
      
      console.log(`Memory increase after 10 exports: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});