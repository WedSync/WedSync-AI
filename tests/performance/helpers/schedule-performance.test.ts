// ✅ WS-162 COMPREHENSIVE PERFORMANCE TESTING SUITE - Helper Schedule Management
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { test as playwrightTest } from '@playwright/test';
import { performance } from 'perf_hooks';
import { 
  HelperAssignment, 
  HelperSchedule, 
  HelperRole, 
  AssignmentStatus,
  ConfirmationStatus 
} from '@/types/helpers';
import { createClient } from '@/lib/supabase/client';
import { detectScheduleConflicts, calculateScheduleStats, optimizeScheduleAssignments } from '@/lib/helpers/schedule-utils';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  SCHEDULE_LOAD_TIME: 2000,        // Schedule should load within 2 seconds
  SCHEDULE_UPDATE_TIME: 1000,      // Updates should complete within 1 second
  CONFLICT_DETECTION_TIME: 500,    // Conflict detection should complete within 500ms
  BULK_OPERATION_TIME: 5000,       // Bulk operations should complete within 5 seconds
  NOTIFICATION_SEND_TIME: 3000,    // Notifications should send within 3 seconds
  DATABASE_QUERY_TIME: 1500,      // Database queries should complete within 1.5 seconds
  UI_INTERACTION_TIME: 300,        // UI interactions should respond within 300ms
  MEMORY_USAGE_LIMIT: 100 * 1024 * 1024, // 100MB memory limit
};

// Test data generators
function generateLargeScheduleDataset(size: number): HelperAssignment[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `assignment-${i}`,
    weddingId: `wedding-${Math.floor(i / 10)}`, // 10 assignments per wedding
    helperId: `helper-${Math.floor(i / 3)}`,    // Each helper has ~3 assignments
    helperName: `Helper ${Math.floor(i / 3)}`,
    helperEmail: `helper${Math.floor(i / 3)}@example.com`,
    helperPhone: `+1-555-${String(i).padStart(4, '0')}`,
    role: [HelperRole.PHOTOGRAPHER, HelperRole.COORDINATOR, HelperRole.CATERER][i % 3],
    tasks: [
      {
        id: `task-${i}-1`,
        title: `Task ${i} - Setup`,
        description: `Setup task for assignment ${i}`,
        category: 'setup' as any,
        priority: 'medium' as any,
        estimatedDuration: 30,
        dependencies: [],
        isCompleted: false
      }
    ],
    schedule: {
      id: `schedule-${i}`,
      assignmentId: `assignment-${i}`,
      date: new Date(2024, 5, 15 + (i % 30)), // Spread across 30 days
      startTime: `${8 + (i % 12)}:00`,         // Varying start times
      endTime: `${12 + (i % 8)}:00`,           // Varying end times
      timeZone: 'America/New_York',
      location: {
        id: `venue-${Math.floor(i / 20)}`,
        name: `Venue ${Math.floor(i / 20)}`,
        address: `${100 + i} Main St, City, ST 12345`,
        coordinates: {
          latitude: 40.7128 + (i % 100) * 0.001,
          longitude: -74.0060 + (i % 100) * 0.001
        }
      },
      isRecurring: false,
      breaks: [],
      confirmationStatus: [ConfirmationStatus.PENDING, ConfirmationStatus.CONFIRMED][i % 2],
      lastModifiedBy: 'test-user',
      lastModifiedAt: new Date()
    },
    status: [AssignmentStatus.PENDING, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED][i % 3],
    notificationPreferences: {
      scheduleChanges: true,
      taskUpdates: true,
      reminderHours: 24,
      preferredMethod: 'email',
      quietHours: { start: '22:00', end: '08:00' }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user'
  }));
}

function measureMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  return 0; // Browser environment fallback
}

describe('WS-162 Helper Schedule Performance Tests', () => {
  let testSupabaseClient: any;
  let performanceData: { operation: string; duration: number; memoryBefore: number; memoryAfter: number }[] = [];

  beforeEach(() => {
    testSupabaseClient = createClient();
    performanceData = [];
  });

  afterEach(() => {
    // Log performance data for analysis
    if (performanceData.length > 0) {
      console.table(performanceData);
    }
  });

  describe('Schedule Loading Performance', () => {
    it('should load 100+ helper schedules within performance threshold', async () => {
      const schedules = generateLargeScheduleDataset(100);
      
      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      // Simulate loading schedules (would normally be from API/database)
      const loadedSchedules = schedules.map(schedule => ({
        ...schedule,
        // Simulate processing overhead
        processedAt: new Date()
      }));

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Load 100 schedules',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_LOAD_TIME);
      expect(loadedSchedules).toHaveLength(100);
      expect(memoryAfter - memoryBefore).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT);
    });

    it('should load 500+ helper schedules efficiently for large events', async () => {
      const schedules = generateLargeScheduleDataset(500);
      
      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      // Simulate batch loading with pagination
      const batchSize = 50;
      const loadedBatches: HelperAssignment[][] = [];

      for (let i = 0; i < schedules.length; i += batchSize) {
        const batch = schedules.slice(i, i + batchSize);
        loadedBatches.push(batch);
        
        // Simulate async batch processing
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Load 500 schedules (batched)',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME);
      expect(loadedBatches.flat()).toHaveLength(500);
    });

    it('should handle concurrent schedule loading efficiently', async () => {
      const schedulePromises = Array.from({ length: 10 }, (_, i) =>
        new Promise<HelperAssignment[]>(resolve => {
          setTimeout(() => {
            resolve(generateLargeScheduleDataset(50));
          }, Math.random() * 100); // Random delay to simulate real conditions
        })
      );

      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      const results = await Promise.all(schedulePromises);

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Concurrent schedule loading (10 x 50)',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_LOAD_TIME);
      expect(results.flat()).toHaveLength(500);
    });
  });

  describe('Schedule Update Performance', () => {
    it('should update individual schedules within performance threshold', async () => {
      const schedule = generateLargeScheduleDataset(1)[0];
      
      const updates = [
        { startTime: '09:00', endTime: '13:00' },
        { startTime: '10:00', endTime: '14:00' },
        { startTime: '11:00', endTime: '15:00' },
        { startTime: '12:00', endTime: '16:00' },
        { startTime: '13:00', endTime: '17:00' }
      ];

      const durations: number[] = [];
      const memoryBefore = measureMemoryUsage();

      for (const update of updates) {
        const startTime = performance.now();
        
        // Simulate schedule update
        const updatedSchedule = {
          ...schedule,
          schedule: {
            ...schedule.schedule,
            ...update,
            lastModifiedAt: new Date()
          }
        };

        const endTime = performance.now();
        durations.push(endTime - startTime);

        expect(updatedSchedule.schedule.startTime).toBe(update.startTime);
      }

      const memoryAfter = measureMemoryUsage();
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

      performanceData.push({
        operation: 'Average schedule update',
        duration: avgDuration,
        memoryBefore,
        memoryAfter
      });

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_UPDATE_TIME);
      expect(Math.max(...durations)).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_UPDATE_TIME * 2);
    });

    it('should handle bulk schedule updates efficiently', async () => {
      const schedules = generateLargeScheduleDataset(100);
      const bulkUpdate = {
        timeZone: 'America/Los_Angeles',
        lastModifiedBy: 'bulk-update-user'
      };

      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      const updatedSchedules = schedules.map(schedule => ({
        ...schedule,
        schedule: {
          ...schedule.schedule,
          ...bulkUpdate,
          lastModifiedAt: new Date()
        }
      }));

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Bulk update 100 schedules',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME);
      expect(updatedSchedules.every(s => s.schedule.timeZone === 'America/Los_Angeles')).toBe(true);
    });

    it('should maintain performance during high-frequency updates', async () => {
      const schedule = generateLargeScheduleDataset(1)[0];
      const updateCount = 50;
      const updates: Array<{ startTime: string; endTime: string }> = [];

      // Generate rapid updates
      for (let i = 0; i < updateCount; i++) {
        updates.push({
          startTime: `${8 + (i % 8)}:${(i % 60).toString().padStart(2, '0')}`,
          endTime: `${16 + (i % 4)}:${(i % 60).toString().padStart(2, '0')}`
        });
      }

      const durations: number[] = [];
      const memoryBefore = measureMemoryUsage();

      for (const update of updates) {
        const startTime = performance.now();
        
        // Simulate rapid schedule update
        schedule.schedule = {
          ...schedule.schedule,
          ...update,
          lastModifiedAt: new Date()
        };

        const endTime = performance.now();
        durations.push(endTime - startTime);

        // Small delay to simulate realistic update frequency
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const memoryAfter = measureMemoryUsage();
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      const avgDuration = totalDuration / updateCount;

      performanceData.push({
        operation: `High-frequency updates (${updateCount} updates)`,
        duration: totalDuration,
        memoryBefore,
        memoryAfter
      });

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_INTERACTION_TIME);
      expect(Math.max(...durations)).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_UPDATE_TIME);
    });
  });

  describe('Conflict Detection Performance', () => {
    it('should detect conflicts in large datasets within performance threshold', async () => {
      // Create dataset with known conflicts
      const schedules = generateLargeScheduleDataset(200);
      
      // Introduce some conflicts
      for (let i = 0; i < 20; i++) {
        const conflictIndex1 = i * 2;
        const conflictIndex2 = i * 2 + 1;
        
        if (conflictIndex2 < schedules.length) {
          // Make schedules overlap
          schedules[conflictIndex1].schedule.date = new Date(2024, 5, 15);
          schedules[conflictIndex1].schedule.startTime = '14:00';
          schedules[conflictIndex1].schedule.endTime = '18:00';
          schedules[conflictIndex1].helperId = 'conflicting-helper';
          
          schedules[conflictIndex2].schedule.date = new Date(2024, 5, 15);
          schedules[conflictIndex2].schedule.startTime = '16:00';
          schedules[conflictIndex2].schedule.endTime = '20:00';
          schedules[conflictIndex2].helperId = 'conflicting-helper';
        }
      }

      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      const conflicts = detectScheduleConflicts(
        schedules.map(s => s.schedule),
        'conflicting-helper'
      );

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Conflict detection (200 schedules)',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONFLICT_DETECTION_TIME);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.length).toBeLessThanOrEqual(20); // Expected conflicts
    });

    it('should efficiently detect conflicts across multiple helpers', async () => {
      const schedules = generateLargeScheduleDataset(300);
      const helperIds = [...new Set(schedules.map(s => s.helperId))];

      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      const allConflicts: any[] = [];
      for (const helperId of helperIds) {
        const helperConflicts = detectScheduleConflicts(
          schedules.map(s => s.schedule),
          helperId
        );
        allConflicts.push(...helperConflicts);
      }

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: `Multi-helper conflict detection (${helperIds.length} helpers)`,
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONFLICT_DETECTION_TIME * 2);
      expect(allConflicts).toBeDefined();
    });

    it('should scale conflict detection linearly', async () => {
      const sizes = [50, 100, 200, 400];
      const results: Array<{ size: number; duration: number }> = [];

      for (const size of sizes) {
        const schedules = generateLargeScheduleDataset(size);
        
        const startTime = performance.now();
        const conflicts = detectScheduleConflicts(schedules.map(s => s.schedule));
        const endTime = performance.now();
        
        const duration = endTime - startTime;
        results.push({ size, duration });

        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONFLICT_DETECTION_TIME * (size / 100));
      }

      // Verify roughly linear scaling (allowing for some variance)
      const scalingFactor = results[3].duration / results[0].duration;
      const expectedScaling = sizes[3] / sizes[0]; // 400/50 = 8

      expect(scalingFactor).toBeLessThan(expectedScaling * 2); // Allow 2x tolerance
    });
  });

  describe('Schedule Optimization Performance', () => {
    it('should optimize large schedule sets within performance threshold', async () => {
      const schedules = generateLargeScheduleDataset(150);
      
      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      const optimizedSchedules = optimizeScheduleAssignments(schedules, 'balanced');

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Schedule optimization (150 assignments)',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME);
      expect(optimizedSchedules).toHaveLength(150);
      expect(optimizedSchedules.every(s => schedules.some(orig => orig.id === s.id))).toBe(true);
    });

    it('should handle different optimization strategies efficiently', async () => {
      const schedules = generateLargeScheduleDataset(100);
      const strategies = ['conflicts', 'travel_time', 'balanced'] as const;

      for (const strategy of strategies) {
        const memoryBefore = measureMemoryUsage();
        const startTime = performance.now();

        const optimized = optimizeScheduleAssignments(schedules, strategy);

        const endTime = performance.now();
        const memoryAfter = measureMemoryUsage();
        const duration = endTime - startTime;

        performanceData.push({
          operation: `Optimization strategy: ${strategy}`,
          duration,
          memoryBefore,
          memoryAfter
        });

        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME);
        expect(optimized).toHaveLength(100);
      }
    });
  });

  describe('Statistics Calculation Performance', () => {
    it('should calculate statistics for large datasets efficiently', async () => {
      const schedules = generateLargeScheduleDataset(500);
      
      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      const stats = calculateScheduleStats(schedules);

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Statistics calculation (500 assignments)',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME);
      expect(stats.totalAssignments).toBe(500);
      expect(stats.totalHours).toBeGreaterThan(0);
      expect(typeof stats.averageAssignmentDuration).toBe('number');
    });

    it('should maintain performance with real-time statistics updates', async () => {
      const schedules = generateLargeScheduleDataset(200);
      const updateCount = 50;

      const durations: number[] = [];
      const memoryBefore = measureMemoryUsage();

      for (let i = 0; i < updateCount; i++) {
        // Simulate adding a new schedule
        const newSchedule = generateLargeScheduleDataset(1)[0];
        schedules.push(newSchedule);

        const startTime = performance.now();
        const stats = calculateScheduleStats(schedules);
        const endTime = performance.now();

        durations.push(endTime - startTime);
        
        expect(stats.totalAssignments).toBe(200 + i + 1);
      }

      const memoryAfter = measureMemoryUsage();
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

      performanceData.push({
        operation: 'Real-time statistics updates',
        duration: avgDuration,
        memoryBefore,
        memoryAfter
      });

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_INTERACTION_TIME);
      expect(Math.max(...durations)).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME);
    });
  });

  describe('Memory Usage and Garbage Collection', () => {
    it('should maintain reasonable memory usage during operations', async () => {
      const initialMemory = measureMemoryUsage();
      const schedules = generateLargeScheduleDataset(1000);
      const afterCreationMemory = measureMemoryUsage();

      // Perform various operations
      const operations = [
        () => detectScheduleConflicts(schedules.map(s => s.schedule)),
        () => calculateScheduleStats(schedules),
        () => optimizeScheduleAssignments(schedules, 'balanced'),
        () => schedules.filter(s => s.status === AssignmentStatus.CONFIRMED),
        () => schedules.sort((a, b) => new Date(a.schedule.date).getTime() - new Date(b.schedule.date).getTime())
      ];

      const operationMemoryUsages: number[] = [];

      for (const operation of operations) {
        const beforeOperation = measureMemoryUsage();
        operation();
        const afterOperation = measureMemoryUsage();
        operationMemoryUsages.push(afterOperation - beforeOperation);
      }

      const finalMemory = measureMemoryUsage();
      const totalMemoryIncrease = finalMemory - initialMemory;

      performanceData.push({
        operation: 'Memory usage check',
        duration: 0,
        memoryBefore: initialMemory,
        memoryAfter: finalMemory
      });

      expect(totalMemoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT);
      expect(operationMemoryUsages.every(usage => usage < PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT / 2)).toBe(true);
    });

    it('should handle rapid allocation/deallocation efficiently', async () => {
      const iterations = 100;
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Create and immediately discard data
        const tempSchedules = generateLargeScheduleDataset(50);
        const tempStats = calculateScheduleStats(tempSchedules);
        
        if (i % 10 === 0) {
          memorySnapshots.push(measureMemoryUsage());
        }

        // Clear references
        tempSchedules.length = 0;
      }

      const memoryVariance = Math.max(...memorySnapshots) - Math.min(...memorySnapshots);
      
      performanceData.push({
        operation: 'Memory allocation/deallocation test',
        duration: 0,
        memoryBefore: memorySnapshots[0],
        memoryAfter: memorySnapshots[memorySnapshots.length - 1]
      });

      // Memory usage shouldn't grow indefinitely
      expect(memoryVariance).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_LIMIT);
    });
  });

  describe('Database Query Performance Simulation', () => {
    it('should simulate efficient database queries', async () => {
      // Simulate various query patterns
      const queryPatterns = [
        { name: 'Get schedules by wedding ID', count: 50 },
        { name: 'Get schedules by helper ID', count: 15 },
        { name: 'Get schedules by date range', count: 100 },
        { name: 'Get conflicting schedules', count: 25 },
        { name: 'Get pending confirmations', count: 30 }
      ];

      for (const pattern of queryPatterns) {
        const schedules = generateLargeScheduleDataset(1000);
        
        const memoryBefore = measureMemoryUsage();
        const startTime = performance.now();

        // Simulate query filtering
        let results: HelperAssignment[];
        
        switch (pattern.name) {
          case 'Get schedules by wedding ID':
            results = schedules.filter(s => s.weddingId === 'wedding-1');
            break;
          case 'Get schedules by helper ID':
            results = schedules.filter(s => s.helperId === 'helper-1');
            break;
          case 'Get schedules by date range':
            const startDate = new Date(2024, 5, 15);
            const endDate = new Date(2024, 5, 20);
            results = schedules.filter(s => 
              s.schedule.date >= startDate && s.schedule.date <= endDate
            );
            break;
          case 'Get conflicting schedules':
            results = schedules.filter(s => 
              s.schedule.confirmationStatus === ConfirmationStatus.PENDING
            );
            break;
          case 'Get pending confirmations':
            results = schedules.filter(s => 
              s.status === AssignmentStatus.PENDING
            );
            break;
          default:
            results = schedules.slice(0, pattern.count);
        }

        const endTime = performance.now();
        const memoryAfter = measureMemoryUsage();
        const duration = endTime - startTime;

        performanceData.push({
          operation: pattern.name,
          duration,
          memoryBefore,
          memoryAfter
        });

        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME);
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should handle concurrent query simulation efficiently', async () => {
      const schedules = generateLargeScheduleDataset(500);
      const concurrentQueries = 10;

      const queryPromises = Array.from({ length: concurrentQueries }, (_, i) =>
        new Promise<HelperAssignment[]>(resolve => {
          setTimeout(() => {
            // Simulate different query types
            const queryType = i % 3;
            let results: HelperAssignment[];
            
            switch (queryType) {
              case 0:
                results = schedules.filter(s => s.role === HelperRole.PHOTOGRAPHER);
                break;
              case 1:
                results = schedules.filter(s => s.status === AssignmentStatus.CONFIRMED);
                break;
              case 2:
                results = schedules.filter(s => s.schedule.confirmationStatus === ConfirmationStatus.CONFIRMED);
                break;
              default:
                results = schedules;
            }
            
            resolve(results);
          }, Math.random() * 100);
        })
      );

      const memoryBefore = measureMemoryUsage();
      const startTime = performance.now();

      const results = await Promise.all(queryPromises);

      const endTime = performance.now();
      const memoryAfter = measureMemoryUsage();
      const duration = endTime - startTime;

      performanceData.push({
        operation: 'Concurrent queries simulation',
        duration,
        memoryBefore,
        memoryAfter
      });

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME * 2);
      expect(results).toHaveLength(concurrentQueries);
      expect(results.every(result => Array.isArray(result))).toBe(true);
    });
  });
});

// Browser-based performance tests using Playwright
playwrightTest.describe('WS-162 Helper Schedule UI Performance Tests', () => {
  playwrightTest('should load schedule management interface within performance threshold', async ({ page }) => {
    // Navigate to schedule management page
    await page.goto('/dashboard/helpers/schedules');

    // Wait for initial load
    const loadStartTime = Date.now();
    await page.waitForSelector('[data-testid="schedule-management"]', { timeout: 10000 });
    const loadEndTime = Date.now();
    const loadTime = loadEndTime - loadStartTime;

    playwrightTest.expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_LOAD_TIME);

    // Verify core elements are present
    await playwrightTest.expect(page.locator('[data-testid="schedule-grid"]')).toBeVisible();
    await playwrightTest.expect(page.locator('[data-testid="filter-controls"]')).toBeVisible();
  });

  playwrightTest('should handle schedule updates with responsive UI', async ({ page }) => {
    await page.goto('/dashboard/helpers/schedules');
    await page.waitForSelector('[data-testid="schedule-management"]');

    // Click on first schedule item
    const updateStartTime = Date.now();
    await page.click('[data-testid^="schedule-item-"]');
    
    // Wait for edit modal to open
    await page.waitForSelector('[data-testid="schedule-edit-modal"]');
    
    // Update schedule time
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '17:00');
    
    // Submit update
    await page.click('[data-testid="save-schedule-btn"]');
    
    // Wait for update to complete
    await page.waitForSelector('[data-testid="update-success-toast"]');
    const updateEndTime = Date.now();
    const updateTime = updateEndTime - updateStartTime;

    playwrightTest.expect(updateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_UPDATE_TIME * 3); // Allow extra time for UI
  });

  playwrightTest('should maintain performance with large schedule datasets', async ({ page }) => {
    // Simulate large dataset by navigating to a page with many schedules
    await page.goto('/dashboard/helpers/schedules?view=all&limit=200');

    const renderStartTime = Date.now();
    
    // Wait for all schedule items to be rendered
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid^="schedule-item-"]').length >= 50,
      { timeout: 10000 }
    );
    
    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime;

    playwrightTest.expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATION_TIME);

    // Test scrolling performance
    const scrollStartTime = Date.now();
    await page.keyboard.press('End'); // Scroll to bottom
    await page.waitForTimeout(100);
    await page.keyboard.press('Home'); // Scroll to top
    const scrollEndTime = Date.now();
    const scrollTime = scrollEndTime - scrollStartTime;

    playwrightTest.expect(scrollTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_INTERACTION_TIME * 5);
  });

  playwrightTest('should handle real-time updates efficiently', async ({ page }) => {
    await page.goto('/dashboard/helpers/schedules');
    await page.waitForSelector('[data-testid="schedule-management"]');

    // Monitor for real-time updates
    const updatePromise = page.waitForSelector('[data-testid="realtime-update-indicator"]', { timeout: 30000 });
    
    // Simulate external schedule update (this would normally come from another user or system)
    await page.evaluate(() => {
      // Simulate WebSocket message for real-time update
      window.dispatchEvent(new CustomEvent('schedule-update', {
        detail: {
          assignmentId: 'test-assignment-1',
          changes: { startTime: '10:00', endTime: '14:00' }
        }
      }));
    });

    const updateStartTime = Date.now();
    await updatePromise;
    const updateEndTime = Date.now();
    const updateTime = updateEndTime - updateStartTime;

    playwrightTest.expect(updateTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_INTERACTION_TIME * 2);
  });

  playwrightTest('should optimize mobile performance', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobileLoadStartTime = Date.now();
    await page.goto('/dashboard/helpers/schedules');
    await page.waitForSelector('[data-testid="schedule-management"]');
    const mobileLoadEndTime = Date.now();
    const mobileLoadTime = mobileLoadEndTime - mobileLoadStartTime;

    // Mobile should load within reasonable time (slightly higher threshold)
    playwrightTest.expect(mobileLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_LOAD_TIME * 1.5);

    // Test touch interactions performance
    const touchStartTime = Date.now();
    await page.tap('[data-testid="add-assignment-btn"]');
    await page.waitForSelector('[data-testid="assignment-form-modal"]');
    const touchEndTime = Date.now();
    const touchTime = touchEndTime - touchStartTime;

    playwrightTest.expect(touchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.UI_INTERACTION_TIME * 2);
  });

  playwrightTest('should handle network conditions gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/helpers/schedules**', async route => {
      // Add artificial delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    const slowNetworkStartTime = Date.now();
    await page.goto('/dashboard/helpers/schedules');
    
    // Should show loading state
    await playwrightTest.expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // Should eventually load
    await page.waitForSelector('[data-testid="schedule-management"]', { timeout: 15000 });
    const slowNetworkEndTime = Date.now();
    const slowNetworkTime = slowNetworkEndTime - slowNetworkStartTime;

    // Should handle slow network within reasonable time
    playwrightTest.expect(slowNetworkTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SCHEDULE_LOAD_TIME * 3);
  });
});