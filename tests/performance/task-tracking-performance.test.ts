/**
 * WS-159 Task Tracking - Performance Tests
 * Load testing and performance validation for task tracking system
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';

// Performance test configuration
const PERFORMANCE_CONFIG = {
  maxResponseTime: 500, // 500ms max for API responses
  maxRenderTime: 100, // 100ms max for UI renders
  concurrentUsers: 50, // Test with 50 concurrent users
  taskLoadSize: 1000, // Test with 1000 tasks
  realTimeLatency: 1000 // 1 second max for real-time updates
};

// Mock heavy task dataset
const generateTaskDataset = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `perf-task-${i}`,
    title: `Performance Test Task ${i}`,
    description: `This is a test task for performance testing with longer description to simulate real-world data loads. Task number ${i} of ${size}.`,
    status: ['pending', 'in_progress', 'completed', 'blocked'][i % 4],
    priority: ['low', 'medium', 'high'][i % 3],
    category: ['venue', 'catering', 'flowers', 'music', 'photography'][i % 5],
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

describe('Task Tracking Performance Tests', () => {
  let performanceData: any[] = [];

  beforeAll(() => {
    performanceData = generateTaskDataset(PERFORMANCE_CONFIG.taskLoadSize);
  });

  afterAll(() => {
    // Generate performance report
    console.log('Performance Test Summary:', {
      tasksProcessed: performanceData.length,
      testDuration: Date.now(),
      memoryUsage: process.memoryUsage()
    });
  });

  test('Task progress calculation performance with large dataset', async () => {
    const { TaskProgressCalculator } = await import('@/lib/task-tracking/TaskProgressCalculator');
    const calculator = new TaskProgressCalculator();

    // Measure calculation performance
    const startTime = performance.now();
    const progress = calculator.calculateOverallProgress(performanceData);
    const endTime = performance.now();

    const calculationTime = endTime - startTime;
    
    expect(calculationTime).toBeLessThan(50); // Should calculate in under 50ms
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);

    console.log(`Progress calculation time: ${calculationTime.toFixed(2)}ms for ${performanceData.length} tasks`);
  });

  test('Weighted progress calculation performance', async () => {
    const { TaskProgressCalculator } = await import('@/lib/task-tracking/TaskProgressCalculator');
    const calculator = new TaskProgressCalculator();

    const iterations = 100;
    const times: number[] = [];

    // Run multiple iterations to get average
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      calculator.calculateWeightedProgress(performanceData);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    expect(averageTime).toBeLessThan(100); // Average under 100ms
    expect(maxTime).toBeLessThan(200); // Max under 200ms

    console.log(`Weighted calculation - Avg: ${averageTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms, Min: ${minTime.toFixed(2)}ms`);
  });

  test('Category progress calculation performance', async () => {
    const { TaskProgressCalculator } = await import('@/lib/task-tracking/TaskProgressCalculator');
    const calculator = new TaskProgressCalculator();

    const startTime = performance.now();
    const categoryProgress = calculator.calculateAllCategoriesProgress(performanceData);
    const endTime = performance.now();

    const calculationTime = endTime - startTime;
    
    expect(calculationTime).toBeLessThan(100); // Should calculate in under 100ms
    expect(Object.keys(categoryProgress)).toHaveLength(5); // 5 categories

    console.log(`Category progress calculation time: ${calculationTime.toFixed(2)}ms`);
  });

  test('Task status manager performance under load', async () => {
    const { TaskStatusManager } = await import('@/lib/task-tracking/TaskStatusManager');
    const statusManager = new TaskStatusManager();

    // Mock successful database updates
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { status: 'pending', version: 1, updated_at: new Date().toISOString() },
              error: null
            })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { status: 'completed', version: 2 },
                error: null
              })
            })
          })
        })
      }),
      from: () => ({
        insert: () => Promise.resolve({ data: null, error: null })
      })
    };

    // Test concurrent status updates
    const concurrentUpdates = 100;
    const updatePromises: Promise<any>[] = [];

    const startTime = performance.now();
    
    for (let i = 0; i < concurrentUpdates; i++) {
      updatePromises.push(
        statusManager.updateStatus(`task-${i}`, 'completed', `Update ${i}`)
      );
    }

    const results = await Promise.all(updatePromises);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const averageTime = totalTime / concurrentUpdates;

    expect(averageTime).toBeLessThan(PERFORMANCE_CONFIG.maxResponseTime);
    
    // All updates should succeed (in ideal conditions with mocked DB)
    const successCount = results.filter(r => r.success).length;
    console.log(`Concurrent updates - Total: ${totalTime.toFixed(2)}ms, Avg: ${averageTime.toFixed(2)}ms, Success rate: ${(successCount/concurrentUpdates*100).toFixed(1)}%`);
  });

  test('Memory usage during large task processing', async () => {
    const { TaskProgressCalculator } = await import('@/lib/task-tracking/TaskProgressCalculator');
    
    const initialMemory = process.memoryUsage();
    
    // Process increasingly large datasets
    const dataSizes = [100, 500, 1000, 5000, 10000];
    const memoryUsages: number[] = [];

    for (const size of dataSizes) {
      const largeDatset = generateTaskDataset(size);
      const calculator = new TaskProgressCalculator();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const beforeMemory = process.memoryUsage();
      
      // Process dataset
      calculator.calculateOverallProgress(largeDatset);
      calculator.calculateWeightedProgress(largeDatset);
      calculator.calculateAllCategoriesProgress(largeDatset);
      
      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
      memoryUsages.push(memoryIncrease);
      
      console.log(`Dataset size ${size}: Memory increase ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }

    // Memory usage should scale reasonably
    const maxMemoryIncrease = Math.max(...memoryUsages);
    expect(maxMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

    const finalMemory = process.memoryUsage();
    console.log(`Total memory usage - Initial: ${(initialMemory.heapUsed/1024/1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed/1024/1024).toFixed(2)}MB`);
  });

  test('Real-time update performance simulation', async () => {
    const { TaskStatusManager } = await import('@/lib/task-tracking/TaskStatusManager');
    const statusManager = new TaskStatusManager();
    
    // Simulate real-time updates
    const updateCallbacks: Array<() => void> = [];
    let callbackExecutionTimes: number[] = [];

    // Register callback that measures execution time
    statusManager.onStatusChange((event) => {
      const startTime = performance.now();
      
      // Simulate processing (DOM updates, state changes, etc.)
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i); // Some CPU work
      }
      
      const endTime = performance.now();
      callbackExecutionTimes.push(endTime - startTime);
    });

    // Trigger multiple status changes rapidly
    const rapidUpdates = 50;
    const startTime = performance.now();

    for (let i = 0; i < rapidUpdates; i++) {
      // Simulate status change event
      const event = {
        taskId: `task-${i}`,
        oldStatus: 'pending',
        newStatus: 'completed',
        timestamp: new Date()
      };
      
      // This would normally be called by the real-time system
      statusManager['statusChangeCallbacks'].forEach(callback => callback(event));
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / rapidUpdates;

    expect(averageTime).toBeLessThan(50); // Each update should process quickly
    
    // Callback execution should be efficient
    const avgCallbackTime = callbackExecutionTimes.reduce((a, b) => a + b, 0) / callbackExecutionTimes.length;
    expect(avgCallbackTime).toBeLessThan(10); // Callbacks should execute in under 10ms

    console.log(`Real-time updates - Total: ${totalTime.toFixed(2)}ms, Avg: ${averageTime.toFixed(2)}ms, Callback avg: ${avgCallbackTime.toFixed(2)}ms`);
  });

  test('Database query performance simulation', async () => {
    // Simulate database query performance with different dataset sizes
    const querySizes = [10, 50, 100, 500, 1000];
    const queryTimes: Record<number, number> = {};

    for (const size of querySizes) {
      const dataset = generateTaskDataset(size);
      
      const startTime = performance.now();
      
      // Simulate database operations
      const filteredTasks = dataset.filter(task => task.status === 'completed');
      const sortedTasks = dataset.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const groupedTasks = dataset.reduce((groups, task) => {
        const category = task.category;
        if (!groups[category]) groups[category] = [];
        groups[category].push(task);
        return groups;
      }, {} as Record<string, any[]>);
      
      const endTime = performance.now();
      queryTimes[size] = endTime - startTime;
      
      expect(queryTimes[size]).toBeLessThan(100); // Each query should complete in under 100ms
    }

    console.log('Database query performance:', queryTimes);
    
    // Performance should scale reasonably with dataset size
    const smallQueryTime = queryTimes[10];
    const largeQueryTime = queryTimes[1000];
    const scalingFactor = largeQueryTime / smallQueryTime;
    
    expect(scalingFactor).toBeLessThan(50); // Should not scale worse than O(n)
  });

  test('Task dependency resolution performance', async () => {
    const { TaskDependencyResolver } = await import('@/lib/task-tracking/TaskDependencyResolver');
    const resolver = new TaskDependencyResolver();

    // Create complex dependency graph
    const complexTasks = generateTaskDataset(500).map((task, index) => ({
      ...task,
      dependencies: index > 0 ? [`perf-task-${index - 1}`] : [] // Chain dependencies
    }));

    // Add some tasks with multiple dependencies
    for (let i = 100; i < 200; i++) {
      complexTasks[i].dependencies = [
        `perf-task-${i - 1}`,
        `perf-task-${i - 2}`,
        `perf-task-${i - 3}`
      ].filter(dep => dep !== complexTasks[i].id);
    }

    const startTime = performance.now();
    
    // Test dependency validation
    const validationResult = resolver.validateDependencies(complexTasks);
    
    // Test execution order resolution
    const executionOrder = resolver.resolveExecutionOrder(complexTasks);
    
    // Test ready tasks identification
    const readyTasks = resolver.getReadyTasks(complexTasks);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(1000); // Complex dependency resolution in under 1 second
    expect(validationResult.valid).toBe(true);
    expect(executionOrder).toHaveLength(complexTasks.length);
    expect(readyTasks).toBeInstanceOf(Array);

    console.log(`Dependency resolution time: ${totalTime.toFixed(2)}ms for ${complexTasks.length} tasks`);
  });

  test('UI rendering performance simulation', async () => {
    // Simulate React component rendering performance
    const renderSizes = [10, 50, 100, 500];
    const renderTimes: number[] = [];

    for (const size of renderSizes) {
      const dataset = generateTaskDataset(size);
      
      const startTime = performance.now();
      
      // Simulate React rendering work
      const virtualDOM = dataset.map(task => ({
        type: 'TaskItem',
        props: {
          key: task.id,
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          category: task.category,
          dueDate: task.due_date
        },
        children: []
      }));
      
      // Simulate reconciliation
      const reconciled = virtualDOM.filter(item => item.props.status !== 'archived');
      
      // Simulate DOM updates
      for (const item of reconciled) {
        // Simulate style calculations
        const styles = {
          backgroundColor: item.props.status === 'completed' ? '#green' : '#white',
          borderColor: item.props.priority === 'high' ? '#red' : '#gray',
          opacity: item.props.status === 'blocked' ? 0.5 : 1
        };
      }
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      renderTimes.push(renderTime);
      
      expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.maxRenderTime);
    }

    const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    console.log(`UI rendering performance - Average: ${averageRenderTime.toFixed(2)}ms`);
  });

  test('Performance regression detection', async () => {
    // Baseline performance measurements (would be stored/loaded from previous runs)
    const baseline = {
      progressCalculation: 45, // ms
      statusUpdate: 25, // ms
      dependencyResolution: 150, // ms
      uiRendering: 80 // ms
    };

    const { TaskProgressCalculator } = await import('@/lib/task-tracking/TaskProgressCalculator');
    const { TaskStatusManager } = await import('@/lib/task-tracking/TaskStatusManager');
    
    // Current performance measurements
    const calculator = new TaskProgressCalculator();
    const statusManager = new TaskStatusManager();
    
    // Measure current performance
    const testDataset = generateTaskDataset(1000);
    
    const startProgress = performance.now();
    calculator.calculateOverallProgress(testDataset);
    const progressTime = performance.now() - startProgress;
    
    // Check for regressions (allow 20% tolerance)
    const regressionThreshold = 1.2;
    
    expect(progressTime).toBeLessThan(baseline.progressCalculation * regressionThreshold);
    
    const performanceDelta = {
      progressCalculation: ((progressTime - baseline.progressCalculation) / baseline.progressCalculation * 100).toFixed(1),
    };

    console.log('Performance regression check:', {
      current: { progressCalculation: progressTime.toFixed(2) },
      baseline,
      delta: performanceDelta
    });
  });
});